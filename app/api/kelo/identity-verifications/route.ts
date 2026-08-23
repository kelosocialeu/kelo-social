import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

const COLLECTION = "eu.kelosocial.identityverification";
const REPO = process.env.CERTIFICATION_REPO_IDENTIFIER?.trim() || "kelosocial.eu";
const PDS =
  process.env.CERTIFICATION_REPO_PDS_URL?.trim() ||
  process.env.NEXT_PUBLIC_IDENTITY_VERIFICATION_PDS_URL?.trim() ||
  "https://eurosky.social";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const agent = new AtpAgent({ service: PDS });
    const records: unknown[] = [];
    let cursor: string | undefined;

    do {
      const response = await agent.api.com.atproto.repo.listRecords({
        repo: REPO,
        collection: COLLECTION,
        limit: 100,
        cursor,
      });
      records.push(...response.data.records.map((item) => item.value));
      cursor = response.data.cursor;
    } while (cursor);

    return NextResponse.json(
      { records },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[api/kelo/identity-verifications] lecture impossible", error);
    return NextResponse.json(
      { error: "Impossible de charger les vérifications d’identité.", records: [] },
      { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
