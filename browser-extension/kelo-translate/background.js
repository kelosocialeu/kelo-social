const KELO_TRANSLATE_ENDPOINT = "https://www.kelosocial.eu/api/translate";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "kelo-translate-batch") return;

  void (async () => {
    try {
      const response = await fetch(KELO_TRANSLATE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: message.texts, target: message.target }),
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.translations)) {
        throw new Error(data.error || "Translation unavailable");
      }
      sendResponse({ ok: true, translations: data.translations });
    } catch (error) {
      sendResponse({ ok: false, error: String(error?.message || error) });
    }
  })();

  return true;
});
