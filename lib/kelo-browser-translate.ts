type TranslationResult = {
  translation: string;
  source?: string;
  engine: "browser" | "server" | "cache";
};

// v3: server-first translation. Browser detection can be unavailable or
// inaccurate on some mobile/tablet browsers, especially for short posts.
const CACHE_PREFIX = "kelo-translate:v3:";

function normalizeLanguage(value: string) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (lower === "zh-cn" || lower === "zh-hans") return "zh-CN";
  if (lower === "zh-tw" || lower === "zh-hant") return "zh-TW";
  return trimmed.split("-")[0].toLowerCase();
}

function targetLanguage(value: string) {
  return normalizeLanguage(value) || "fr";
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
  return `${CACHE_PREFIX}${targetLanguage(target)}:${hashText(text)}`;
}

function readCache(text: string, target: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(text, target));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value?: string; createdAt?: number };
    if (!parsed.value) return null;
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
    // Translation still works when local storage is unavailable.
  }
}

async function translateOnServer(text: string, target: string): Promise<TranslationResult> {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, target: targetLanguage(target) }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.translation !== "string" || !data.translation.trim()) {
    throw new Error(data.error || "translation unavailable");
  }
  return { translation: data.translation.trim(), source: data.source, engine: "server" };
}

async function translateInBrowser(text: string, target: string): Promise<TranslationResult | null> {
  if (typeof window === "undefined") return null;
  const w = window as any;
  const TranslatorApi = w.Translator;
  const LanguageDetectorApi = w.LanguageDetector;
  if (!TranslatorApi?.availability || !TranslatorApi?.create || !LanguageDetectorApi?.create) return null;

  let detector: any = null;
  let translator: any = null;
  try {
    const detectorAvailability = await LanguageDetectorApi.availability?.();
    if (detectorAvailability === "unavailable") return null;

    detector = await LanguageDetectorApi.create();
    const detected = await detector.detect(text);
    const detectedLanguage = detected?.[0]?.detectedLanguage || detected?.[0]?.language || "";
    const source = normalizeLanguage(detectedLanguage);
    const normalizedTarget = targetLanguage(target);

    if (!source) return null;
    if (source === normalizedTarget) return { translation: text, source, engine: "browser" };

    const availability = await TranslatorApi.availability({ sourceLanguage: source, targetLanguage: normalizedTarget });
    if (availability === "unavailable") return null;

    translator = await TranslatorApi.create({ sourceLanguage: source, targetLanguage: normalizedTarget });
    const translation = await translator.translate(text);
    if (typeof translation !== "string" || !translation.trim()) return null;
    return { translation: translation.trim(), source, engine: "browser" };
  } catch {
    return null;
  } finally {
    translator?.destroy?.();
    detector?.destroy?.();
  }
}

export async function translateKeloText(text: string, target: string): Promise<TranslationResult> {
  const cleanText = text.trim();
  if (!cleanText) return { translation: "", engine: "cache" };

  const normalizedTarget = targetLanguage(target);
  const cached = readCache(cleanText, normalizedTarget);
  if (cached) return { translation: cached, engine: "cache" };

  // Always use the Kelo server first. This gives all devices the same language
  // detection and translation behavior and avoids browser-specific failures.
  try {
    const serverResult = await translateOnServer(cleanText, normalizedTarget);
    if (serverResult.translation.trim()) {
      writeCache(cleanText, normalizedTarget, serverResult.translation);
      return serverResult;
    }
  } catch {
    // Continue with the local browser engine when the server is temporarily unavailable.
  }

  const browserResult = await translateInBrowser(cleanText, normalizedTarget);
  if (browserResult) {
    writeCache(cleanText, normalizedTarget, browserResult.translation);
    return browserResult;
  }

  throw new Error("translation unavailable");
}
