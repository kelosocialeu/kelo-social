const language = document.getElementById("language");
const translateButton = document.getElementById("translate");
const restoreButton = document.getElementById("restore");
const status = document.getElementById("status");

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("Aucun onglet actif");
  return tab;
}

async function setStatus(message) {
  status.textContent = message;
}

void chrome.storage.sync.get(["keloTranslateTarget"]).then((data) => {
  if (typeof data.keloTranslateTarget === "string") language.value = data.keloTranslateTarget;
});

language.addEventListener("change", () => {
  void chrome.storage.sync.set({ keloTranslateTarget: language.value });
});

translateButton.addEventListener("click", async () => {
  translateButton.disabled = true;
  await setStatus("Traduction de la page…");
  try {
    const tab = await activeTab();
    const result = await chrome.tabs.sendMessage(tab.id, { type: "kelo-translate-page", target: language.value });
    if (!result?.ok) throw new Error(result?.error || "Traduction indisponible");
    await setStatus(`${result.count || 0} éléments traduits.`);
  } catch (error) {
    await setStatus(`Erreur : ${error?.message || error}`);
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
    await setStatus("Texte original restauré.");
  } catch (error) {
    await setStatus(`Erreur : ${error?.message || error}`);
  } finally {
    restoreButton.disabled = false;
  }
});
