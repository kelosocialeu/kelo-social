import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 5000;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_MAX = 2000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 60;

type CacheEntry = { value: string; source?: string; createdAt: number };
type RateEntry = { count: number; resetAt: number };

const globalStore = globalThis as typeof globalThis & {
  __keloTranslateCache?: Map<string, CacheEntry>;
  __keloTranslateRate?: Map<string, RateEntry>;
};

const translationCache = globalStore.__keloTranslateCache ?? new Map<string, CacheEntry>();
const rateStore = globalStore.__keloTranslateRate ?? new Map<string, RateEntry>();
globalStore.__keloTranslateCache = translationCache;
globalStore.__keloTranslateRate = rateStore;

function normalizeLanguage(value: string) {
  const trimmed = value.trim();
  if (trimmed.toLowerCase() === "zh-cn") return "zh-CN";
  return trimmed.split("-")[0].toLowerCase();
}

function hashText(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function cacheKey(text: string, target: string) {
  return `${normalizeLanguage(target)}:${hashText(text)}`;
}

function readCache(text: string, target: string) {
  const key = cacheKey(text, target);
  const entry = translationCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    translationCache.delete(key);
    return null;
  }
  return entry;
}

function writeCache(text: string, target: string, value: string, source?: string) {
  if (translationCache.size >= CACHE_MAX) {
    const oldest = translationCache.keys().next().value as string | undefined;
    if (oldest) translationCache.delete(oldest);
  }
  translationCache.set(cacheKey(text, target), { value, source, createdAt: Date.now() });
}

function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(request: NextRequest) {
  const key = clientIp(request);
  const now = Date.now();
  const current = rateStore.get(key);
  if (!current || now >= current.resetAt) {
    rateStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

function protectTokens(text: string) {
  const values: string[] = [];
  const protectedText = text.replace(/https?:\/\/[^\s]+|@[A-Za-z0-9._:-]+|#[\p{L}\p{N}_-]+/gu, (token) => {
    const index = values.push(token) - 1;
    return `KELOTOKEN${index}X`;
  });
  return { protectedText, values };
}

function restoreTokens(text: string, values: string[]) {
  return text.replace(/KELOTOKEN(\d+)X/g, (match, indexValue) => {
    const index = Number(indexValue);
    return Number.isInteger(index) && values[index] ? values[index] : match;
  });
}

async function translateWithConfiguredEndpoint(text: string, target: string) {
  const endpoint = process.env.KELO_TRANSLATE_URL;
  if (!endpoint) return null;

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (process.env.KELO_TRANSLATE_API_KEY) headers.Authorization = `Bearer ${process.env.KELO_TRANSLATE_API_KEY}`;

  const upstream = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ q: text, source: "auto", target, format: "text" }),
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) throw new Error(`Configured translator returned ${upstream.status}`);
  const translation = data.translatedText || data.translation || data.text;
  if (typeof translation !== "string" || !translation.trim()) throw new Error("Invalid configured translator response");
  return { translation: translation.trim(), source: typeof data.detectedLanguage?.language === "string" ? data.detectedLanguage.language : data.source };
}

async function translateWithFreeFallback(text: string, target: string) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", target === "fil" ? "tl" : target);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": "KeloTranslate/1.0 (+https://kelosocial.eu)" },
    cache: "force-cache",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Free translator returned ${response.status}`);

  const data = await response.json();
  const rows = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];
  const translation = rows
    .map((row: unknown) => (Array.isArray(row) && typeof row[0] === "string" ? row[0] : ""))
    .join("")
    .trim();
  const source = Array.isArray(data) && typeof data[2] === "string" ? data[2] : undefined;
  if (!translation) throw new Error("Invalid free translator response");
  return { translation, source };
}

export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(request)) {
      return NextResponse.json({ error: "Trop de demandes de traduction" }, { status: 429 });
    }

    const body = await request.json() as { text?: unknown; target?: unknown };
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const target = typeof body.target === "string" ? normalizeLanguage(body.target) : "";

    if (!text || !target) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    if (text.length > MAX_TEXT_LENGTH) return NextResponse.json({ error: "Texte trop long" }, { status: 413 });
    if (!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(target)) return NextResponse.json({ error: "Langue cible invalide" }, { status: 400 });

    const cached = readCache(text, target);
    if (cached) return NextResponse.json({ translation: cached.value, source: cached.source, engine: "cache" });

    const { protectedText, values } = protectTokens(text);
    let result: { translation: string; source?: string } | null = null;
    let engine = "kelo";

    try {
      result = await translateWithConfiguredEndpoint(protectedText, target);
    } catch (error) {
      console.warn("Configured Kelo Translate endpoint failed", error);
    }

    if (!result) {
      result = await translateWithFreeFallback(protectedText, target);
      engine = "free-fallback";
    }

    const translation = restoreTokens(result.translation, values);
    writeCache(text, target, translation, result.source);

    return NextResponse.json(
      { translation, source: result.source, engine },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch (error) {
    console.error("Kelo Translate failed", error);
    return NextResponse.json({ error: "Traduction temporairement indisponible" }, { status: 502 });
  }
}
