import { NextRequest, NextResponse } from "next/server";

const APPVIEW = "https://public.api.bsky.app/xrpc";

function normalize(value: string | null) {
  return (value || "").trim();
}

function boundedLimit(raw: string | null) {
  const parsed = Number(raw || 50);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(Math.max(Math.floor(parsed), 1), 100);
}

async function fetchJson(url: URL) {
  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data?.message === "string"
        ? data.message
        : `AppView search failed (${response.status})`
    );
  }
  return data;
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
      const url = new URL(`${APPVIEW}/app.bsky.actor.searchActors`);
      url.searchParams.set("q", query);
      url.searchParams.set("limit", String(limit));
      if (cursor) url.searchParams.set("cursor", cursor);

      const data = await fetchJson(url);
      return NextResponse.json({
        items: Array.isArray(data.actors) ? data.actors : [],
        cursor: typeof data.cursor === "string" ? data.cursor : null,
      });
    }

    if (type === "posts") {
      const url = new URL(`${APPVIEW}/app.bsky.feed.searchPosts`);
      const hashtagOnly = query.startsWith("#") && query.length > 1 && !/\s/.test(query);
      const cleanQuery = hashtagOnly ? query.slice(1) : query;

      url.searchParams.set("q", cleanQuery);
      url.searchParams.set("limit", String(limit));
      if (hashtagOnly) url.searchParams.append("tag", cleanQuery);
      if (cursor) url.searchParams.set("cursor", cursor);

      const data = await fetchJson(url);
      return NextResponse.json({
        items: Array.isArray(data.posts) ? data.posts : [],
        cursor: typeof data.cursor === "string" ? data.cursor : null,
      });
    }

    return NextResponse.json({ error: "Type de recherche invalide." }, { status: 400 });
  } catch (error) {
    console.error("[api/search]", { type, query, error });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "La recherche fédérée est temporairement indisponible.",
      },
      { status: 502 }
    );
  }
}
