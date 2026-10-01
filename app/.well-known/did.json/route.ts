import { NextResponse } from "next/server";
import { KELO_FEED_GENERATOR_DID, KELO_FEED_SERVICE_URL } from "@/lib/kelo-feed-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!KELO_FEED_GENERATOR_DID.startsWith("did:web:")) {
    return NextResponse.json({ error: "DIDWebRequired" }, { status: 500 });
  }

  return NextResponse.json({
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: KELO_FEED_GENERATOR_DID,
    service: [{
      id: `${KELO_FEED_GENERATOR_DID}#bsky_fg`,
      type: "BskyFeedGenerator",
      serviceEndpoint: KELO_FEED_SERVICE_URL,
    }],
  }, {
    headers: { "Content-Type": "application/did+json" },
  });
}
