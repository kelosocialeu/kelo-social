import { NextRequest, NextResponse } from "next/server";

const APPVIEWS = [
  "https://public.api.bsky.app/xrpc",
  "https://api.bsky.app/xrpc",
];

const SEARCH_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
};

function normalize(value: string | null) {
  return (value || "").trim();
}

function boundedLimit(raw: string | null) {
  const parsed = Number(raw || 50);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(Math.max(Math.floor(parsed), 1), 100);
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
      lastMessage =
        typeof data?.message === "string"
          ? data.message
          : `AppView search failed (${response.status})`;
    } catch (error) {
      lastMessage = error instanceof Error ? error.message : "AppView indisponible";
    }
  }

  const error = new Error(lastMessage) as Error & { status?: number };
  error.status = lastStatus;
  throw error;
}

async function searchPosts(query: string, limit: number, cursor: string) {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);

  const data = await fetchJsonFromAppView("app.bsky.feed.searchPosts", params);
  return {
    items: Array.isArray(data.posts) ? data.posts : [],
    cursor: typeof data.cursor === "string" ? data.cursor : null,
  };
}

export async function GET(request: NextRequest) {
  const query = normalize(request.nextUrl.searchParams.get("q"));
  const type = normalize(request.nextUrl.searchParams.get("type"));
  const cursor = normalize(request.nextUrl.searchParams.get("cursor"));
  const limit = boundedLimit(request.nextUrl.searchParams.get("limit"));

  if (query.length < 2) {
    return NextResponse.json({ items: [], cursor: null });
  }

  try {
    if (type === "accounts") {
      const params = new URLSearchParams();
      params.set("q", query);
      params.set("limit", String(limit));
      if (cursor) params.set("cursor", cursor);

      const data = await fetchJsonFromAppView("app.bsky.actor.searchActors", params);
      return NextResponse.json(
        {
          items: Array.isArray(data.actors) ? data.actors : [],
          cursor: typeof data.cursor === "string" ? data.cursor : null,
        },
        { headers: SEARCH_CACHE_HEADERS },
      );
    }

    if (type === "posts") {
      const result = await searchPosts(query, limit, cursor);
      return NextResponse.json(result, { headers: SEARCH_CACHE_HEADERS });
    }

    return NextResponse.json(
      { error: "Type de recherche invalide." },
      { status: 400 },
    );
  } catch (error) {
    console.error("[api/search]", { type, query, error });

    const upstreamStatus =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status?: number }).status || 0)
        : 0;

    return NextResponse.json(
      {
        error:
          type === "posts"
            ? "La recherche de publications est temporairement indisponible."
            : "La recherche de comptes est temporairement indisponible.",
        upstreamStatus: upstreamStatus || undefined,
      },
      { status: 502 },
    );
  }
}
