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

  const data = await response.json();
  if (!response.ok || data?.response?.status !== "success") {
    throw new Error(data?.response?.message || `Erreur POEditor ${response.status}`);
  }
  return data;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const languagesResponse = await post("/languages/list", {});
  const languages = languagesResponse?.result?.languages || [];

  if (!languages.length) {
    console.log("Aucune langue configurée dans POEditor.");
    return;
  }

  console.log(`${languages.length} langue(s) trouvée(s) dans POEditor.`);

  for (const language of languages) {
    const code = language.code;
    process.stdout.write(`Export ${code}... `);

    const exportResponse = await post("/projects/export", {
      language: code,
      type: "key_value_json",
      fallback_language: "fr",
    });

    const downloadUrl = exportResponse?.result?.url;
    if (!downloadUrl) throw new Error(`URL d'export absente pour ${code}`);

    const fileResponse = await fetch(downloadUrl);
    if (!fileResponse.ok) throw new Error(`Téléchargement impossible pour ${code}`);

    const content = await fileResponse.text();
    JSON.parse(content);
    await fs.writeFile(path.join(OUTPUT_DIR, `${code}.json`), content, "utf8");
    console.log("OK");
  }

  console.log("Synchronisation POEditor terminée.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
