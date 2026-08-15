import fs from "node:fs/promises";
import path from "node:path";

const API_TOKEN = process.env.POEDITOR_API_TOKEN;
const PROJECT_ID = process.env.POEDITOR_PROJECT_ID;
const SOURCE_LANGUAGE = "fr";

if (!API_TOKEN || !PROJECT_ID) {
  console.error("POEDITOR_API_TOKEN et POEDITOR_PROJECT_ID sont requis.");
  process.exit(1);
}

const API = "https://api.poeditor.com/v2";

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
  const sourcePath = path.join(process.cwd(), "public", "locales", `${SOURCE_LANGUAGE}.json`);
  const source = JSON.parse(await fs.readFile(sourcePath, "utf8"));
  const entries = Object.entries(source).filter(([, value]) => typeof value === "string");

  if (!entries.length) {
    console.log("Aucune chaîne source à envoyer.");
    return;
  }

  const terms = entries.map(([term]) => ({ term }));
  await post("/terms/add", { data: JSON.stringify(terms) });

  const translations = entries.map(([term, value]) => ({
    term,
    translation: { content: value },
  }));

  await post("/translations/update", {
    language: SOURCE_LANGUAGE,
    data: JSON.stringify(translations),
  });

  console.log(`${entries.length} chaîne(s) françaises envoyée(s) vers POEditor sans supprimer les termes existants.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
