type TranslationResult = {
  translation: string;
  source?: string;
  engine: "browser" | "server" | "cache";
};

const CACHE_PREFIX = "kelo-translate:v1:";

function normalizeLanguage(value: string) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "fr";
  return trimmed.toLowerCase() === "zh-cn" ? "zh-CN" : trimmed.split("-")[0];
}

function hashText(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function cacheKey(text: string, target: string) {
  return `${CACHE_PREFIX}${normalizeLanguage(target)}:${hashText(text)}`;
}

function readCache(text: string, target: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(text, target));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value?: string; createdAt?: number };
    if (!parsed.value) return null;
    // Keep translations for 30 days. This avoids repeated AI work for viral posts.
    if (parsed.createdAt && Date.now() - parsed.createdAt > 30 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(cacheKey(text, target));
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

function writeCache(text: string, target: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(cacheKey(text, target), JSON.stringify({ value, createdAt: Date.now() }));
  } catch {
    // Storage can be unavailable in private mode or full. Translation still works.
  }
}

async function translateInBrowser(text: string, target: string): Promise<TranslationResult | null> {
  if (typeof window === "undefined") return null;
  const w = window as any;
  const TranslatorApi = w.Translator;
  const LanguageDetectorApi = w.LanguageDetector;
  if (!TranslatorApi?.availability || !TranslatorApi?.create || !LanguageDetectorApi?.create) return null;

  try {
    const detectorAvailability = await LanguageDetectorApi.availability?.();
    if (detectorAvailability === "unavailable") return null;

    const detector = await LanguageDetectorApi.create();
    const detected = await detector.detect(text);
    const source = normalizeLanguage(detected?.[0]?.detectedLanguage || detected?.[0]?.language || "");
    const normalizedTarget = normalizeLanguage(target);
    if (!source || source === normalizedTarget) return { translation: text, source, engine: "browser" };

    const availability = await TranslatorApi.availability({ sourceLanguage: source, targetLanguage: normalizedTarget });
    if (availability === "unavailable") return null;

    const translator = await TranslatorApi.create({ sourceLanguage: source, targetLanguage: normalizedTarget });
    const translation = await translator.translate(text);
    translator.destroy?.();
    detector.destroy?.();
    if (typeof translation !== "string" || !translation.trim()) return null;
    return { translation, source, engine: "browser" };
  } catch {
    return null;
  }
}

async function translateOnServer(text: string, target: string): Promise<TranslationResult> {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, target: normalizeLanguage(target) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.translation !== "string") {
    throw new Error(data.error || "translation unavailable");
  }
  return { translation: data.translation, source: data.source, engine: "server" };
}

export async function translateKeloText(text: string, target: string): Promise<TranslationResult> {
  const cleanText = text.trim();
  if (!cleanText) return { translation: "", engine: "cache" };

  const cached = readCache(cleanText, target);
  if (cached) return { translation: cached, engine: "cache" };

  const browserResult = await translateInBrowser(cleanText, target);
  if (browserResult) {
    writeCache(cleanText, target, browserResult.translation);
    return browserResult;
  }

  const serverResult = await translateOnServer(cleanText, target);
  writeCache(cleanText, target, serverResult.translation);
  return serverResult;
}
