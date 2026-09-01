import { NextRequest, NextResponse } from "next/server";

const APPVIEWS = [
  "https://public.api.bsky.app/xrpc",
  "https://api.bsky.app/xrpc",
];

function normalize(value: string | null) {
  return (value || "").trim();
}

function boundedLimit(raw: string | null) {
  const parsed = Number(raw || 50);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(Math.max(Math.floor(parsed), 1), 100);
}

function tokenizeQuery(query: string) {
  const tokens = query
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const keywords = Array.from(
    new Set(
      tokens
        .map((token) => token.replace(/^#+/, ""))
        .map((token) => token.replace(/^[^\wÀ-ÿ-]+|[^\wÀ-ÿ-]+$/g, ""))
        .filter((token) => token.length >= 2)
    )
  ).slice(0, 6);

  const tags = Array.from(
    new Set(
      tokens
        .filter((token) => token.startsWith("#"))
        .map((token) => token.replace(/^#+/, "").replace(/[^\wÀ-ÿ-]/g, ""))
        .filter((token) => token.length >= 2)
    )
  ).slice(0, 4);

  return { keywords, tags };
}

async function fetchJsonFromAppView(path: string, params: URLSearchParams) {
  let lastStatus = 502;
  let lastMessage = "AppView indisponible";

  for (const base of APPVIEWS) {
    const url = new URL(`${base}/${path}`);
    params.forEach((value, key) => url.searchParams.append(key, value));

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "KeloSocial/1.0 (+https://kelosocial.eu)",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) return data;

      lastStatus = response.status;
      lastMessage = typeof data?.message === "string" ? data.message : `AppView search failed (${response.status})`;
    } catch (error) {
      lastMessage = error instanceof Error ? error.message : "AppView indisponible";
    }
  }

  const error = new Error(lastMessage) as Error & { status?: number };
  error.status = lastStatus;
  throw error;
}

function postText(post: any) {
  const text = post?.record?.text;
  return typeof text === "string" ? text.toLocaleLowerCase("fr") : "";
}

function relevanceScore(post: any, fullQuery: string, keywords: string[]) {
  const text = postText(post);
  if (!text) return 0;
  const normalizedFull = fullQuery.replace(/#/g, "").trim().toLocaleLowerCase("fr");
  let score = 0;
  if (normalizedFull && text.includes(normalizedFull)) score += 20;
  for (const keyword of keywords) {
    if (text.includes(keyword.toLocaleLowerCase("fr"))) score += 5;
  }
  return score;
}

async function searchPostsByKeywords(query: string, limit: number, cursor: string) {
  const { keywords, tags } = tokenizeQuery(query);
  const cleanPhrase = query.replace(/#/g, " ").replace(/\s+/g, " ").trim();
  const searches: Array<{ q: string; tag?: string }> = [];
  if (cleanPhrase.length >= 2) searches.push({ q: cleanPhrase });
  for (const keyword of keywords) {
    if (keyword.toLocaleLowerCase("fr") !== cleanPhrase.toLocaleLowerCase("fr")) searches.push({ q: keyword });
  }
  for (const tag of tags) searches.push({ q: tag, tag });

  const uniqueSearches = searches.filter((entry, index, list) =>
    list.findIndex((other) => other.q === entry.q && other.tag === entry.tag) === index
  ).slice(0, 8);
  if (uniqueSearches.length === 0) return { items: [], cursor: null };

  let cursorState: Record<string, string> = {};
  if (cursor) {
    try { cursorState = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")); } catch { cursorState = {}; }
  }

  const perSearchLimit = Math.min(50, Math.max(10, Math.ceil(limit / uniqueSearches.length) + 5));
  const settled = await Promise.allSettled(uniqueSearches.map(async (search, index) => {
    const key = `${index}:${search.q}:${search.tag || ""}`;
    const params = new URLSearchParams();
    params.set("q", search.q);
    params.set("limit", String(perSearchLimit));
    if (search.tag) params.append("tag", search.tag);
    if (cursorState[key]) params.set("cursor", cursorState[key]);
    const data = await fetchJsonFromAppView("app.bsky.feed.searchPosts", params);
    return { key, posts: Array.isArray(data.posts) ? data.posts : [], cursor: typeof data.cursor === "string" ? data.cursor : "" };
  }));

  const successful = settled.filter((result): result is PromiseFulfilledResult<{ key: string; posts: any[]; cursor: string }> => result.status === "fulfilled");

  // SearchPosts can occasionally be unavailable upstream. Do not turn the whole
  // Explorer page into an error: return an empty post section so account search
  // and the rest of the UI remain usable.
  if (successful.length === 0) {
    console.warn("[api/search] all post-search AppViews failed", settled.map((result) => result.status === "rejected" ? String(result.reason) : "ok"));
    return { items: [], cursor: null };
  }

  const byUri = new Map<string, any>();
  const nextCursorState: Record<string, string> = {};
  for (const result of successful) {
    for (const post of result.value.posts) if (post?.uri && !byUri.has(post.uri)) byUri.set(post.uri, post);
    if (result.value.cursor) nextCursorState[result.value.key] = result.value.cursor;
  }

  const ranked = Array.from(byUri.values())
    .map((post) => ({ post, score: relevanceScore(post, cleanPhrase, keywords) }))
    .filter(({ score }) => score > 0 || keywords.length === 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aDate = Date.parse(a.post?.record?.createdAt || "") || 0;
      const bDate = Date.parse(b.post?.record?.createdAt || "") || 0;
      return bDate - aDate;
    }).slice(0, limit).map(({ post }) => post);

  const nextCursor = Object.keys(nextCursorState).length > 0
    ? Buffer.from(JSON.stringify(nextCursorState), "utf8").toString("base64url") : null;
  return { items: ranked, cursor: nextCursor };
}

export async function GET(request: NextRequest) {
  const query = normalize(request.nextUrl.searchParams.get("q"));
  const type = normalize(request.nextUrl.searchParams.get("type"));
  const cursor = normalize(request.nextUrl.searchParams.get("cursor"));
  const limit = boundedLimit(request.nextUrl.searchParams.get("limit"));
  if (query.length < 2) return NextResponse.json({ items: [], cursor: null });

  try {
    if (type === "accounts") {
      const params = new URLSearchParams();
      params.set("q", query);
      params.set("limit", String(limit));
      if (cursor) params.set("cursor", cursor);
      const data = await fetchJsonFromAppView("app.bsky.actor.searchActors", params);
      return NextResponse.json({ items: Array.isArray(data.actors) ? data.actors : [], cursor: typeof data.cursor === "string" ? data.cursor : null });
    }
    if (type === "posts") return NextResponse.json(await searchPostsByKeywords(query, limit, cursor));
    return NextResponse.json({ error: "Type de recherche invalide." }, { status: 400 });
  } catch (error) {
    console.error("[api/search]", { type, query, error });

    // Explorer runs account and post searches together. A transient post-search
    // outage must not reject Promise.all on the client and hide valid accounts.
    if (type === "posts") return NextResponse.json({ items: [], cursor: null, degraded: true });

    const upstreamStatus = error && typeof error === "object" && "status" in error
      ? Number((error as { status?: number }).status || 0) : 0;
    return NextResponse.json({ error: "La recherche de comptes est temporairement indisponible.", upstreamStatus: upstreamStatus || undefined }, { status: 502 });
  }
}
