import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 5000;
const MAX_BATCH_ITEMS = 60;
const MAX_BATCH_CHARS = 12000;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_MAX = 5000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 60;
const CONCURRENCY = 8;

type CacheEntry = { value: string; source?: string; createdAt: number };
type RateEntry = { count: number; resetAt: number };

type TranslationResult = { translation: string; source?: string; engine: "cache" | "kelo" | "free-fallback" };

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
    headers: { Accept: "application/json", "User-Agent": "KeloTranslate/1.1 (+https://kelosocial.eu)" },
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

async function translateOne(text: string, target: string): Promise<TranslationResult> {
  const cached = readCache(text, target);
  if (cached) return { translation: cached.value, source: cached.source, engine: "cache" };

  const { protectedText, values } = protectTokens(text);
  let result: { translation: string; source?: string } | null = null;
  let engine: TranslationResult["engine"] = "kelo";

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
  return { translation, source: result.source, engine };
}

async function translateBatch(texts: string[], target: string) {
  const output = new Array<TranslationResult>(texts.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= texts.length) return;
      try {
        output[index] = await translateOne(texts[index], target);
      } catch (error) {
        console.warn(`Kelo Translate batch item ${index} failed`, error);
        output[index] = { translation: texts[index], engine: "free-fallback" };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, texts.length) }, () => worker()));
  return output;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(request: NextRequest) {
  const corsHeaders = { "Access-Control-Allow-Origin": "*" };
  try {
    if (isRateLimited(request)) {
      return NextResponse.json({ error: "Trop de demandes de traduction" }, { status: 429, headers: corsHeaders });
    }

    const body = await request.json() as { text?: unknown; texts?: unknown; target?: unknown };
    const target = typeof body.target === "string" ? normalizeLanguage(body.target) : "";
    if (!target || !/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(target)) {
      return NextResponse.json({ error: "Langue cible invalide" }, { status: 400, headers: corsHeaders });
    }

    if (Array.isArray(body.texts)) {
      const texts = body.texts.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim());
      const totalChars = texts.reduce((sum, value) => sum + value.length, 0);
      if (!texts.length || texts.length > MAX_BATCH_ITEMS) return NextResponse.json({ error: "Lot invalide" }, { status: 400, headers: corsHeaders });
      if (totalChars > MAX_BATCH_CHARS || texts.some((value) => value.length > MAX_TEXT_LENGTH)) {
        return NextResponse.json({ error: "Lot de traduction trop volumineux" }, { status: 413, headers: corsHeaders });
      }

      const results = await translateBatch(texts, target);
      return NextResponse.json(
        { translations: results.map((result) => result.translation), results },
        { headers: { ...corsHeaders, "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
      );
    }

    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400, headers: corsHeaders });
    if (text.length > MAX_TEXT_LENGTH) return NextResponse.json({ error: "Texte trop long" }, { status: 413, headers: corsHeaders });

    const result = await translateOne(text, target);
    return NextResponse.json(
      result,
      { headers: { ...corsHeaders, "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch (error) {
    console.error("Kelo Translate failed", error);
    return NextResponse.json({ error: "Traduction temporairement indisponible" }, { status: 502, headers: corsHeaders });
  }
}
