import fs from "node:fs/promises";
import path from "node:path";

const API_TOKEN = process.env.POEDITOR_API_TOKEN;
const PROJECT_ID = process.env.POEDITOR_PROJECT_ID;
const SOURCE_LANGUAGE = "fr";
const API = "https://api.poeditor.com/v2";
const LOCALES_DIR = path.join(process.cwd(), "public", "locales");
const TRANSLATE_DELAY_MS = 350;
const LANGUAGE_DELAY_MS = 1500;
const MAX_RETRIES = 6;

const LANGUAGES = [
  "en", "zh-CN", "hi", "es", "ar", "bn", "pt", "ru", "ur", "id",
  "de", "ja", "sw", "mr", "te", "tr", "ta", "vi", "ko", "fa",
  "ha", "th", "it", "pl", "uk", "nl", "ro", "el", "cs", "hu",
  "sv", "da", "no", "fi", "bg", "sr", "hr", "sk", "sl", "he",
  "ms", "fil", "pa", "gu", "kn", "ml", "ne", "si", "my", "km",
  "lo", "mn", "ka", "hy", "az", "kk", "uz", "af", "am", "yo",
  "ig", "zu", "xh", "so", "mg", "rw", "ht", "ca", "eu", "gl",
  "cy", "ga", "mt", "eo", "mi", "sm", "haw", "jv", "ceb", "ps"
];

const GOOGLE_CODE = {
  "zh-CN": "zh-CN",
  fil: "tl",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function protectText(text) {
  const protectedValues = [];
  const patterns = [
    /\{[^{}]+\}/g,
    /Kelo Social/g,
    /Kelo ID/g,
    /AT Protocol/g,
    /POEditor/g,
    /@[A-Za-z0-9._-]+/g,
    /https?:\/\/\S+/g,
  ];
  let output = text;
  for (const pattern of patterns) {
    output = output.replace(pattern, (match) => {
      const token = `__KELO_KEEP_${protectedValues.length}__`;
      protectedValues.push(match);
      return token;
    });
  }
  return { output, protectedValues };
}

function restoreText(text, protectedValues) {
  let output = text;
  protectedValues.forEach((value, index) => {
    const variants = [
      `__KELO_KEEP_${index}__`,
      `__ KELO_KEEP_${index} __`,
      `__kelo_keep_${index}__`,
    ];
    for (const token of variants) output = output.split(token).join(value);
  });
  return output;
}

function isRateLimit(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /429|too many requests|rate limit|quota|temporarily unavailable/i.test(message);
}

async function withRetry(label, task) {
  let attempt = 0;
  while (true) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= MAX_RETRIES) throw error;
      attempt += 1;
      const rateLimited = isRateLimit(error);
      const waitMs = rateLimited
        ? Math.min(120000, 8000 * 2 ** (attempt - 1))
        : Math.min(30000, 2500 * attempt);
      console.log(`\n${label}: nouvelle tentative dans ${Math.round(waitMs / 1000)} s (${attempt}/${MAX_RETRIES})...`);
      await sleep(waitMs);
    }
  }
}

async function translateGoogle(text, target) {
  const { output, protectedValues } = protectText(text);
  const language = GOOGLE_CODE[target] || target;
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", SOURCE_LANGUAGE);
  url.searchParams.set("tl", language);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", output);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 KeloSocial-i18n/1.0",
      Accept: "application/json,text/plain,*/*",
    },
  });
  if (!response.ok) {
    const error = new Error(`Traduction ${target}: HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const translated = Array.isArray(data?.[0])
    ? data[0].map((part) => part?.[0] || "").join("")
    : "";
  if (!translated.trim()) throw new Error(`Réponse de traduction vide pour ${target}`);
  return restoreText(translated, protectedValues).trim();
}

async function poeditorPost(endpoint, fields) {
  if (!API_TOKEN || !PROJECT_ID) return null;
  const body = new URLSearchParams({
    api_token: API_TOKEN,
    id: PROJECT_ID,
    ...fields,
  });
  const response = await fetch(`${API}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  let data = null;
  try { data = await response.json(); } catch {}
  if (!response.ok || data?.response?.status !== "success") {
    const error = new Error(data?.response?.message || `POEditor HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function uploadLanguage(code, dictionary) {
  if (!API_TOKEN || !PROJECT_ID) {
    console.log("POEDITOR_API_TOKEN/POEDITOR_PROJECT_ID absents : fichier local uniquement.");
    return;
  }
  const translations = Object.entries(dictionary)
    .filter(([, value]) => typeof value === "string" && value.trim())
    .map(([term, value]) => ({ term, translation: { content: value } }));

  const chunkSize = 100;
  for (let i = 0; i < translations.length; i += chunkSize) {
    const chunk = translations.slice(i, i + chunkSize);
    await withRetry(`POEditor ${code}`, () => poeditorPost("/translations/update", {
      language: code,
      data: JSON.stringify(chunk),
    }));
    await sleep(1200);
  }
}

async function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function main() {
  await fs.mkdir(LOCALES_DIR, { recursive: true });
  const sourcePath = path.join(LOCALES_DIR, `${SOURCE_LANGUAGE}.json`);
  const source = await readJson(sourcePath);
  const entries = Object.entries(source).filter(([, value]) => typeof value === "string" && value.trim());
  if (!entries.length) throw new Error("Le fichier public/locales/fr.json est vide ou introuvable.");

  console.log(`${entries.length} terme(s) source, ${LANGUAGES.length} langues cibles.`);
  console.log("Le script reprend automatiquement les traductions déjà présentes.");

  let languageSuccess = 0;
  const failures = [];

  for (const code of LANGUAGES) {
    const targetPath = path.join(LOCALES_DIR, `${code}.json`);
    const dictionary = await readJson(targetPath, {});
    let translatedNow = 0;
    console.log(`\n=== ${code} ===`);

    try {
      for (let index = 0; index < entries.length; index += 1) {
        const [key, sourceText] = entries[index];
        if (typeof dictionary[key] === "string" && dictionary[key].trim()) continue;

        process.stdout.write(`[${index + 1}/${entries.length}] ${key}... `);
        const translated = await withRetry(`${code}/${key}`, () => translateGoogle(sourceText, code));
        dictionary[key] = translated;
        translatedNow += 1;
        await fs.writeFile(targetPath, JSON.stringify(dictionary, null, 2) + "\n", "utf8");
        console.log("OK");
        await sleep(TRANSLATE_DELAY_MS);
      }

      console.log(`${code}: ${translatedNow} nouvelle(s) traduction(s). Envoi vers POEditor...`);
      await uploadLanguage(code, dictionary);
      languageSuccess += 1;
      console.log(`${code}: terminé.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ code, message });
      console.error(`${code}: ÉCHEC — ${message}`);
      console.log("Les traductions déjà créées ont été conservées. Relancez la commande pour reprendre.");
    }

    await sleep(LANGUAGE_DELAY_MS);
  }

  console.log(`\nTerminé : ${languageSuccess}/${LANGUAGES.length} langue(s) traitée(s).`);
  if (failures.length) {
    console.log("Langues à reprendre :");
    failures.forEach(({ code, message }) => console.log(`- ${code}: ${message}`));
  }
  console.log("Vous pouvez relancer npm run i18n:translate80 : les valeurs déjà remplies seront ignorées.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
