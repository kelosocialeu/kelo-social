import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

const COLLECTION = "eu.kelosocial.certification";
const PDS_URL = process.env.KELO_ADMIN_PDS_URL?.trim() || "https://pds.kelosocial.eu";
const REPO = process.env.NEXT_PUBLIC_KELO_ADMIN_DID?.trim() || process.env.KELO_ADMIN_ATPROTO_IDENTIFIER?.trim() || "kelosocial.eu";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const agent = new AtpAgent({ service: PDS_URL });
    const records: unknown[] = [];
    let cursor: string | undefined;
    do {
      const response = await agent.api.com.atproto.repo.listRecords({ repo: REPO, collection: COLLECTION, limit: 100, cursor });
      records.push(...response.data.records.map((item) => item.value));
      cursor = response.data.cursor;
    } while (cursor);
    return NextResponse.json({ records, meta: { count: records.length, repo: REPO, fetchedAt: new Date().toISOString() } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/kelo/certifications] lecture impossible", error);
    return NextResponse.json({ error: error instanceof Error ? `Impossible de charger les certifications Kelo Social : ${error.message}` : "Impossible de charger les certifications Kelo Social.", records: [] }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
