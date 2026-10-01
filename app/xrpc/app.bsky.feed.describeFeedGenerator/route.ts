import { NextResponse } from "next/server";
import { KELO_FEED_GENERATOR_DID, KELO_FEED_SERVICE_URL, KELO_FEED_URIS } from "@/lib/kelo-feed-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    did: KELO_FEED_GENERATOR_DID,
    feeds: Object.entries(KELO_FEED_URIS).map(([id, uri]) => ({
      uri,
      id,
      name: id === "very-low" ? "Kelo Social — Très peu" :
        id === "medium" ? "Kelo Social — Moyen" :
        id === "medium-addictive" ? "Kelo Social — Addictif moyen" :
        "Kelo Social — Addictif",
      description: "Algorithme de recommandation Kelo Social.",
    })),
    serviceEndpoint: KELO_FEED_SERVICE_URL,
  });
}
