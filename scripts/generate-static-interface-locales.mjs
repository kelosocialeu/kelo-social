import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_LANGUAGE = "fr";
const LOCALES_DIR = path.join(process.cwd(), "public", "locales");
const SOURCE_PATH = path.join(LOCALES_DIR, `${SOURCE_LANGUAGE}.json`);
const REQUEST_DELAY_MS = 120;
const RETRIES = 4;
const MAX_CHARS_PER_BATCH = 3200;

// Exactement les langues proposées par Kelo Social, hors français (langue source).
// Les fichiers générés sont des ressources statiques : aucune API de traduction
// n'est appelée par les utilisateurs lorsqu'ils naviguent sur Kelo Social.
const TARGET_LANGUAGES = [
  "en", "zh-CN", "hi", "es", "ar", "bn", "pt", "ru", "ur", "id",
  "de", "ja", "sw", "mr", "te", "tr", "ta", "vi", "ko", "fa",
  "ha", "it", "th", "gu", "pl", "uk", "pa", "ml", "kn", "or",
  "my", "nl", "ro", "el", "cs", "hu", "sv", "az", "uz", "am",
  "so", "ne", "si", "km", "lo", "fil", "ms", "jv", "su", "yo",
  "ig", "zu", "xh", "rw", "mg", "af", "he", "bg", "sr", "hr",
  "sk", "da", "fi", "no", "lt", "lv", "et", "sl", "bs", "sq",
  "mk", "ka", "hy", "kk", "ky", "tg", "tk", "mn", "ca"
];

const GOOGLE_LANGUAGE_CODES = {
  fil: "tl",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function protect(text) {
  const values = [];
  const patterns = [
    /\{[a-zA-Z0-9_]+\}/g,
    /Kelo Social/g,
    /Kelo ID/g,
    /AT Protocol/g,
    /https?:\/\/\S+/g,
    /@[A-Za-z0-9._-]+/g,
  ];

  let output = text;
  for (const pattern of patterns) {
    output = output.replace(pattern, (value) => {
      const token = `__KELO_KEEP_${values.length}__`;
      values.push(value);
      return token;
    });
  }

  return { output, values };
}

function restore(text, values) {
  let output = text;
  values.forEach((value, index) => {
    const token = `__KELO_KEEP_${index}__`;
    output = output.split(token).join(value);
  });
  return output;
}

async function translateText(text, target) {
  const { output, values } = protect(text);
  const language = GOOGLE_LANGUAGE_CODES[target] || target;
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", SOURCE_LANGUAGE);
  url.searchParams.set("tl", language);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", output);

  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json,text/plain,*/*",
          "User-Agent": "KeloSocial-static-i18n/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const translated = Array.isArray(data?.[0])
        ? data[0].map((part) => part?.[0] || "").join("")
        : "";

      if (!translated.trim()) throw new Error("réponse vide");
      return restore(translated.trim(), values);
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await sleep(800 * attempt);
    }
  }

  throw lastError;
}

function makeBatches(entries) {
  const batches = [];
  let current = [];
  let chars = 0;

  for (const entry of entries) {
    const size = entry[1].length + 40;
    if (current.length && chars + size > MAX_CHARS_PER_BATCH) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(entry);
    chars += size;
  }

  if (current.length) batches.push(current);
  return batches;
}

async function translateBatch(batch, target) {
  // Les marqueurs servent uniquement à séparer les phrases après traduction.
  const marked = batch
    .map(([key, value], index) => `__KELO_ROW_${index}__ ${value}`)
    .join("\n");

  const translated = await translateText(marked, target);
  const result = {};

  for (let index = 0; index < batch.length; index += 1) {
    const marker = `__KELO_ROW_${index}__`;
    const nextMarker = index + 1 < batch.length ? `__KELO_ROW_${index + 1}__` : null;
    const start = translated.indexOf(marker);
    const end = nextMarker ? translated.indexOf(nextMarker) : translated.length;

    if (start < 0 || end < 0 || end < start) {
      throw new Error(`marqueur de lot perdu (${target}, ligne ${index})`);
    }

    const [key] = batch[index];
    result[key] = translated.slice(start + marker.length, end).trim();
  }

  return result;
}

async function translateLanguage(entries, target) {
  const targetPath = path.join(LOCALES_DIR, `${target}.json`);
  let existing = {};

  try {
    existing = JSON.parse(await fs.readFile(targetPath, "utf8"));
  } catch {}

  const missing = entries.filter(([key]) => !String(existing[key] || "").trim());
  if (!missing.length) {
    console.log(`${target}: déjà complet`);
    return true;
  }

  const dictionary = { ...existing };
  const batches = makeBatches(missing);
  console.log(`${target}: ${missing.length} terme(s), ${batches.length} lot(s)`);

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    try {
      Object.assign(dictionary, await translateBatch(batch, target));
    } catch {
      // Si le service modifie un marqueur de lot, on retombe sur une traduction
      // terme par terme pour ce seul lot afin de garder un résultat fiable.
      for (const [key, source] of batch) {
        dictionary[key] = await translateText(source, target);
        await sleep(REQUEST_DELAY_MS);
      }
    }

    await fs.writeFile(targetPath, JSON.stringify(dictionary, null, 2) + "\n", "utf8");
    await sleep(REQUEST_DELAY_MS);
  }

  return true;
}

async function main() {
  await fs.mkdir(LOCALES_DIR, { recursive: true });
  const source = JSON.parse(await fs.readFile(SOURCE_PATH, "utf8"));
  const entries = Object.entries(source).filter(([, value]) => typeof value === "string" && value.trim());

  if (!entries.length) throw new Error("public/locales/fr.json est vide.");

  const failures = [];
  for (const target of TARGET_LANGUAGES) {
    try {
      await translateLanguage(entries, target);
    } catch (error) {
      failures.push(`${target}: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`Échec ${target}:`, error);
    }
  }

  if (failures.length) {
    console.error("Langues incomplètes :\n" + failures.join("\n"));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
