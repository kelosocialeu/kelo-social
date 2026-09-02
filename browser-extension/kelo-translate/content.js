const ORIGINAL_TEXT = new WeakMap();
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "NOSCRIPT", "SVG", "CANVAS"]);

function shouldSkip(node) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  if (parent.closest("[translate='no'], [data-no-translate], [contenteditable='true']")) return true;
  return false;
}

function collectVisibleTextNodes() {
  const nodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const value = current.nodeValue || "";
    if (!shouldSkip(current) && value.trim().length >= 2) {
      const parent = current.parentElement;
      const rect = parent?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        if (!ORIGINAL_TEXT.has(current)) ORIGINAL_TEXT.set(current, value);
        nodes.push(current);
      }
    }
    current = walker.nextNode();
  }
  return nodes;
}

function makeBatches(nodes) {
  const batches = [];
  let current = [];
  let chars = 0;
  for (const node of nodes) {
    const text = (ORIGINAL_TEXT.get(node) || node.nodeValue || "").trim();
    if (!text) continue;
    if (current.length && (current.length >= 40 || chars + text.length > 9000)) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push({ node, text });
    chars += text.length;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function translatePage(target) {
  const nodes = collectVisibleTextNodes();
  const batches = makeBatches(nodes);
  let translatedCount = 0;

  for (const batch of batches) {
    const result = await chrome.runtime.sendMessage({
      type: "kelo-translate-batch",
      target,
      texts: batch.map((item) => item.text),
    });
    if (!result?.ok || !Array.isArray(result.translations)) {
      throw new Error(result?.error || "Translation unavailable");
    }

    batch.forEach((item, index) => {
      const translated = result.translations[index];
      if (typeof translated !== "string" || !translated.trim()) return;
      if (!item.node.isConnected) return;
      const original = ORIGINAL_TEXT.get(item.node) || item.node.nodeValue || "";
      const leading = original.match(/^\s*/)?.[0] || "";
      const trailing = original.match(/\s*$/)?.[0] || "";
      item.node.nodeValue = `${leading}${translated.trim()}${trailing}`;
      translatedCount += 1;
    });
  }

  return translatedCount;
}

function restorePage() {
  const nodes = collectVisibleTextNodes();
  let restored = 0;
  for (const node of nodes) {
    const original = ORIGINAL_TEXT.get(node);
    if (typeof original === "string" && node.isConnected) {
      node.nodeValue = original;
      restored += 1;
    }
  }
  return restored;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "kelo-translate-page") {
    void translatePage(message.target)
      .then((count) => sendResponse({ ok: true, count }))
      .catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }
  if (message?.type === "kelo-restore-page") {
    sendResponse({ ok: true, count: restorePage() });
  }
});
