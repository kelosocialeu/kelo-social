import { NextResponse } from "next/server";
import { KELO_FEED_GENERATOR_DID, KELO_FEED_URIS } from "@/lib/kelo-feed-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    did: KELO_FEED_GENERATOR_DID,
    feeds: Object.values(KELO_FEED_URIS).map((uri) => ({ uri })),
  });
}
