import { NextRequest, NextResponse } from "next/server";
import { getKeloFeedSkeleton, KELO_FEED_URIS } from "@/lib/kelo-feed-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const feed = request.nextUrl.searchParams.get("feed") || "";
  const limit = Number(request.nextUrl.searchParams.get("limit") || 50);
  const cursor = request.nextUrl.searchParams.get("cursor") || undefined;

  if (!Object.values(KELO_FEED_URIS).includes(feed as any)) {
    return NextResponse.json({ error: "UnknownFeed", message: "Unknown Kelo feed." }, { status: 400 });
  }

  try {
    const result = await getKeloFeedSkeleton(
      feed,
      Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 50,
      cursor,
      request.headers.get("accept-language") || ""
    );
    return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=10, s-maxage=10" } });
  } catch (error) {
    console.error("Kelo Feed Generator error:", error);
    return NextResponse.json({ error: "InternalServerError", message: "Kelo Feed Generator is temporarily unavailable." }, { status: 500 });
  }
}
