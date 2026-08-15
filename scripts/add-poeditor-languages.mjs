const API = "https://api.poeditor.com/v2";

const token = process.env.POEDITOR_API_TOKEN;
const projectId = process.env.POEDITOR_PROJECT_ID;

if (!token || !projectId) {
  console.error("POEDITOR_API_TOKEN et POEDITOR_PROJECT_ID sont requis.");
  process.exit(1);
}

async function post(path, params = {}) {
  const body = new URLSearchParams({ api_token: token, ...params });
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await response.json();
  if (!response.ok || data?.response?.status !== "success") {
    const message = data?.response?.message || `Erreur HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

const available = await post("/languages/available");
const current = await post("/languages/list", { id: projectId });

const existing = new Set((current.result?.languages || []).map((language) => language.code));
const languages = available.result?.languages || [];

console.log(`${languages.length} langues prises en charge par POEditor.`);
console.log(`${existing.size} langue(s) déjà présente(s) dans le projet.`);

let added = 0;
let skipped = 0;
let failed = 0;

for (const language of languages) {
  if (existing.has(language.code)) {
    skipped++;
    continue;
  }

  try {
    await post("/languages/add", {
      id: projectId,
      language: language.code,
    });
    added++;
    console.log(`✓ ${language.name} [${language.code}]`);
  } catch (error) {
    failed++;
    console.error(`✗ ${language.name} [${language.code}] : ${error.message}`);
  }
}

console.log("\nTerminé.");
console.log(`Ajoutées : ${added}`);
console.log(`Déjà présentes : ${skipped}`);
console.log(`Échecs : ${failed}`);

if (failed > 0) process.exitCode = 1;
