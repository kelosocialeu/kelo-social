import { NextRequest, NextResponse } from "next/server";

const APPVIEW_SEARCH_URL =
  "https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead";

function cleanQuery(value: string) {
  return value.trim().replace(/^@/, "").slice(0, 100);
}

export async function GET(request: NextRequest) {
  const query = cleanQuery(request.nextUrl.searchParams.get("q") || "");

  if (query.length < 2) {
    return NextResponse.json({ actors: [] });
  }

  try {
    const url = new URL(APPVIEW_SEARCH_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "10");

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      throw new Error(`AppView search failed (${response.status})`);
    }

    const data = (await response.json()) as {
      actors?: Array<{
        did?: string;
        handle?: string;
        displayName?: string;
        avatar?: string;
      }>;
    };

    const actors = (data.actors || [])
      .filter((actor) => actor.did && actor.handle)
      .map((actor) => ({
        did: actor.did,
        handle: actor.handle,
        displayName: actor.displayName || actor.handle,
        avatar: actor.avatar || null,
      }));

    return NextResponse.json({ actors });
  } catch (error) {
    console.error("[admin/account-search]", error);
    return NextResponse.json(
      { actors: [], error: "Recherche AT Protocol temporairement indisponible." },
      { status: 502 }
    );
  }
}
