import fs from "node:fs/promises";
import path from "node:path";

const API_TOKEN = process.env.POEDITOR_API_TOKEN;
const PROJECT_ID = process.env.POEDITOR_PROJECT_ID;

if (!API_TOKEN || !PROJECT_ID) {
  console.error("POEDITOR_API_TOKEN et POEDITOR_PROJECT_ID sont requis.");
  process.exit(1);
}

const API = "https://api.poeditor.com/v2";
const OUTPUT_DIR = path.join(process.cwd(), "public", "locales");
const REQUEST_DELAY_MS = 1200;
const MAX_RETRIES = 5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function post(endpoint, fields) {
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
  try {
    data = await response.json();
  } catch {}

  if (!response.ok || data?.response?.status !== "success") {
    const message = data?.response?.message || `Erreur POEditor ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

function isRateLimit(error) {
  const message = error instanceof Error ? error.message : String(error);
  return error?.status === 429 || /too many requests|rate limit|429/i.test(message);
}

async function withRetry(label, task) {
  let attempt = 0;
  while (true) {
    try {
      return await task();
    } catch (error) {
      if (!isRateLimit(error) || attempt >= MAX_RETRIES) throw error;
      attempt += 1;
      const waitMs = Math.min(60000, 5000 * 2 ** (attempt - 1));
      console.log(`\n${label}: limite POEditor atteinte, nouvelle tentative dans ${Math.round(waitMs / 1000)} s (${attempt}/${MAX_RETRIES})...`);
      await sleep(waitMs);
    }
  }
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const languagesResponse = await withRetry("Liste des langues", () => post("/languages/list", {}));
  const languages = languagesResponse?.result?.languages || [];

  if (!languages.length) {
    console.log("Aucune langue configurée dans POEditor.");
    return;
  }

  console.log(`${languages.length} langue(s) trouvée(s) dans POEditor.`);
  console.log(`Temporisation activée : ${REQUEST_DELAY_MS} ms entre les langues, avec reprise automatique sur erreur 429.`);

  let successCount = 0;
  const failures = [];

  for (const language of languages) {
    const code = language.code;
    process.stdout.write(`Export ${code}... `);

    try {
      const exportResponse = await withRetry(`Export ${code}`, () => post("/projects/export", {
        language: code,
        type: "key_value_json",
        fallback_language: "fr",
      }));

      const downloadUrl = exportResponse?.result?.url;
      if (!downloadUrl) throw new Error(`URL d'export absente pour ${code}`);

      const fileResponse = await withRetry(`Téléchargement ${code}`, async () => {
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          const error = new Error(`Téléchargement impossible pour ${code} (${response.status})`);
          error.status = response.status;
          throw error;
        }
        return response;
      });

      const content = await fileResponse.text();
      JSON.parse(content);
      await fs.writeFile(path.join(OUTPUT_DIR, `${code}.json`), content, "utf8");
      successCount += 1;
      console.log("OK");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ code, message });
      console.log(`ÉCHEC — ${message}`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`Synchronisation POEditor terminée : ${successCount} export(s) réussi(s), ${failures.length} échec(s).`);

  if (failures.length) {
    console.log("Langues encore en échec :");
    for (const failure of failures) {
      console.log(`- ${failure.code}: ${failure.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
