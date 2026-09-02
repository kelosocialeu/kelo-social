const ORIGINAL_TEXT = new WeakMap();
const TRANSLATED_TARGET = new WeakMap();
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "NOSCRIPT", "SVG", "CANVAS"]);

let activeTarget = null;
let observer = null;
let observerTimer = null;
let translating = false;

function normalizeLanguage(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return trimmed.toLowerCase() === "zh-cn" ? "zh-CN" : trimmed.split("-")[0].toLowerCase();
}

function shouldSkip(node) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  if (parent.closest("[translate='no'], [data-no-translate], [contenteditable='true']")) return true;
  return false;
}

function isVisible(node) {
  const parent = node.parentElement;
  if (!parent) return false;
  const style = window.getComputedStyle(parent);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = parent.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function collectVisibleTextNodes(root = document.body, onlyUntranslated = false) {
  if (!root) return [];
  const nodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const value = current.nodeValue || "";
    const alreadyForTarget = activeTarget && TRANSLATED_TARGET.get(current) === activeTarget;
    if (!shouldSkip(current) && value.trim().length >= 2 && isVisible(current) && (!onlyUntranslated || !alreadyForTarget)) {
      if (!ORIGINAL_TEXT.has(current)) ORIGINAL_TEXT.set(current, value);
      nodes.push(current);
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

async function detectSourceLanguage(text) {
  const Detector = globalThis.LanguageDetector;
  if (!Detector?.availability || !Detector?.create) return null;
  try {
    const availability = await Detector.availability();
    if (availability === "unavailable") return null;
    const detector = await Detector.create();
    const detected = await detector.detect(text);
    detector.destroy?.();
    return normalizeLanguage(detected?.[0]?.detectedLanguage || detected?.[0]?.language || "");
  } catch {
    return null;
  }
}

async function translateBatchInBrowser(texts, target) {
  const Translator = globalThis.Translator;
  if (!Translator?.availability || !Translator?.create || !texts.length) return null;

  const sample = texts.join(" ").slice(0, 2000);
  const source = await detectSourceLanguage(sample);
  const normalizedTarget = normalizeLanguage(target);
  if (!source || !normalizedTarget) return null;
  if (source === normalizedTarget) return texts.slice();

  try {
    const availability = await Translator.availability({ sourceLanguage: source, targetLanguage: normalizedTarget });
    if (availability === "unavailable") return null;
    const translator = await Translator.create({ sourceLanguage: source, targetLanguage: normalizedTarget });
    const output = [];
    for (const text of texts) {
      const translated = await translator.translate(text);
      output.push(typeof translated === "string" && translated.trim() ? translated : text);
    }
    translator.destroy?.();
    return output;
  } catch {
    return null;
  }
}

async function translateBatch(batch, target) {
  const texts = batch.map((item) => item.text);
  const browserTranslations = await translateBatchInBrowser(texts, target);
  if (Array.isArray(browserTranslations) && browserTranslations.length === texts.length) {
    return browserTranslations;
  }

  const result = await chrome.runtime.sendMessage({
    type: "kelo-translate-batch",
    target,
    texts,
  });
  if (!result?.ok || !Array.isArray(result.translations)) {
    throw new Error(result?.error || "Translation unavailable");
  }
  return result.translations;
}

function applyTranslation(item, translated, target) {
  if (typeof translated !== "string" || !translated.trim()) return false;
  if (!item.node.isConnected) return false;
  const original = ORIGINAL_TEXT.get(item.node) || item.node.nodeValue || "";
  const leading = original.match(/^\s*/)?.[0] || "";
  const trailing = original.match(/\s*$/)?.[0] || "";
  item.node.nodeValue = `${leading}${translated.trim()}${trailing}`;
  TRANSLATED_TARGET.set(item.node, target);
  return true;
}

async function translateNodes(nodes, target) {
  const batches = makeBatches(nodes);
  let translatedCount = 0;
  for (const batch of batches) {
    const translations = await translateBatch(batch, target);
    batch.forEach((item, index) => {
      if (applyTranslation(item, translations[index], target)) translatedCount += 1;
    });
  }
  return translatedCount;
}

async function translatePage(target, onlyUntranslated = false) {
  if (translating) return 0;
  translating = true;
  activeTarget = normalizeLanguage(target);
  try {
    const nodes = collectVisibleTextNodes(document.body, onlyUntranslated);
    const count = await translateNodes(nodes, activeTarget);
    startObserver();
    return count;
  } finally {
    translating = false;
  }
}

function scheduleDynamicTranslation() {
  if (!activeTarget) return;
  clearTimeout(observerTimer);
  observerTimer = setTimeout(() => {
    void translatePage(activeTarget, true).catch(() => {});
  }, 450);
}

function startObserver() {
  if (observer || !document.body) return;
  observer = new MutationObserver((mutations) => {
    if (!activeTarget || translating) return;
    if (mutations.some((mutation) => mutation.type === "childList" && mutation.addedNodes.length > 0)) {
      scheduleDynamicTranslation();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function stopObserver() {
  observer?.disconnect();
  observer = null;
  clearTimeout(observerTimer);
}

function restorePage() {
  stopObserver();
  activeTarget = null;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  let restored = 0;
  while (current) {
    const original = ORIGINAL_TEXT.get(current);
    if (typeof original === "string" && current.isConnected) {
      current.nodeValue = original;
      TRANSLATED_TARGET.delete(current);
      restored += 1;
    }
    current = walker.nextNode();
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
