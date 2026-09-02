const language = document.getElementById("language");
const translateButton = document.getElementById("translate");
const restoreButton = document.getElementById("restore");
const status = document.getElementById("status");

const KELO_LANGUAGES = [
  ["fr", "Français"], ["en", "English"], ["zh-CN", "简体中文"], ["hi", "हिन्दी"],
  ["es", "Español"], ["ar", "العربية"], ["bn", "বাংলা"], ["pt", "Português"],
  ["ru", "Русский"], ["ur", "اردو"], ["id", "Bahasa Indonesia"], ["de", "Deutsch"],
  ["ja", "日本語"], ["sw", "Kiswahili"], ["mr", "मराठी"], ["te", "తెలుగు"],
  ["tr", "Türkçe"], ["ta", "தமிழ்"], ["vi", "Tiếng Việt"], ["ko", "한국어"],
  ["fa", "فارسی"], ["ha", "Hausa"], ["it", "Italiano"], ["th", "ไทย"],
  ["gu", "ગુજરાતી"], ["pl", "Polski"], ["uk", "Українська"], ["pa", "ਪੰਜਾਬੀ"],
  ["ml", "മലയാളം"], ["kn", "ಕನ್ನಡ"], ["or", "ଓଡ଼ିଆ"], ["my", "မြန်မာဘာသာ"],
  ["nl", "Nederlands"], ["ro", "Română"], ["el", "Ελληνικά"], ["cs", "Čeština"],
  ["hu", "Magyar"], ["sv", "Svenska"], ["az", "Azərbaycanca"], ["uz", "O‘zbekcha"],
  ["am", "አማርኛ"], ["so", "Soomaali"], ["ne", "नेपाली"], ["si", "සිංහල"],
  ["km", "ខ្មែរ"], ["lo", "ລາວ"], ["fil", "Filipino"], ["ms", "Bahasa Melayu"],
  ["jv", "Basa Jawa"], ["su", "Basa Sunda"], ["yo", "Yorùbá"], ["ig", "Igbo"],
  ["zu", "isiZulu"], ["xh", "isiXhosa"], ["rw", "Kinyarwanda"], ["mg", "Malagasy"],
  ["af", "Afrikaans"], ["he", "עברית"], ["bg", "Български"], ["sr", "Српски"],
  ["hr", "Hrvatski"], ["sk", "Slovenčina"], ["da", "Dansk"], ["fi", "Suomi"],
  ["no", "Norsk"], ["lt", "Lietuvių"], ["lv", "Latviešu"], ["et", "Eesti"],
  ["sl", "Slovenščina"], ["bs", "Bosanski"], ["sq", "Shqip"], ["mk", "Македонски"],
  ["ka", "ქართული"], ["hy", "Հայերեն"], ["kk", "Қазақша"], ["ky", "Кыргызча"],
  ["tg", "Тоҷикӣ"], ["tk", "Türkmençe"], ["mn", "Монгол"], ["ca", "Català"]
];

language.replaceChildren(...KELO_LANGUAGES.map(([code, label]) => {
  const option = document.createElement("option");
  option.value = code;
  option.textContent = label;
  return option;
}));

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("Aucun onglet actif");
  return tab;
}

function setStatus(message) {
  status.textContent = message;
}

void chrome.storage.sync.get(["keloTranslateTarget"]).then((data) => {
  const saved = typeof data.keloTranslateTarget === "string" ? data.keloTranslateTarget : "fr";
  language.value = KELO_LANGUAGES.some(([code]) => code === saved) ? saved : "fr";
});

language.addEventListener("change", () => {
  void chrome.storage.sync.set({ keloTranslateTarget: language.value });
});

translateButton.addEventListener("click", async () => {
  translateButton.disabled = true;
  setStatus("Traduction de la page…");
  try {
    const tab = await activeTab();
    const result = await chrome.tabs.sendMessage(tab.id, { type: "kelo-translate-page", target: language.value });
    if (!result?.ok) throw new Error(result?.error || "Traduction indisponible");
    setStatus(`${result.count || 0} éléments traduits.`);
  } catch (error) {
    setStatus(`Erreur : ${error?.message || error}`);
  } finally {
    translateButton.disabled = false;
  }
});

restoreButton.addEventListener("click", async () => {
  restoreButton.disabled = true;
  try {
    const tab = await activeTab();
    const result = await chrome.tabs.sendMessage(tab.id, { type: "kelo-restore-page" });
    if (!result?.ok) throw new Error(result?.error || "Impossible de restaurer la page");
    setStatus("Texte original restauré.");
  } catch (error) {
    setStatus(`Erreur : ${error?.message || error}`);
  } finally {
    restoreButton.disabled = false;
  }
});
