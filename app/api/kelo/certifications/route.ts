import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

const COLLECTION = "eu.kelosocial.certification";
const PDS_URL = process.env.KELO_ADMIN_PDS_URL?.trim() || "https://pds.kelosocial.eu";
const REPO = process.env.NEXT_PUBLIC_KELO_ADMIN_DID?.trim() || process.env.KELO_ADMIN_ATPROTO_IDENTIFIER?.trim() || "kelosocial.eu";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CACHE_TTL_MS = 30_000;
let cachedRecords: unknown[] | null = null;
let cachedAt = 0;
let pendingFetch: Promise<unknown[]> | null = null;

async function fetchCertificationRecords(): Promise<unknown[]> {
  const agent = new AtpAgent({ service: PDS_URL });
    const records: unknown[] = [];
    let cursor: string | undefined;
    do {
      const response = await agent.api.com.atproto.repo.listRecords({ repo: REPO, collection: COLLECTION, limit: 100, cursor });
      records.push(...response.data.records.map((item) => item.value));
      cursor = response.data.cursor;
    } while (cursor);
    cachedRecords = records;
    cachedAt = Date.now();
    return records;
  } catch (error) {
    if (cachedRecords) return cachedRecords;
    throw error;
  }
}

export async function GET() {
  try {
    if (cachedRecords && Date.now() - cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({ records: cachedRecords, meta: { count: cachedRecords.length, repo: REPO, cached: true } }, { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } });
    }
    if (!pendingFetch) pendingFetch = fetchCertificationRecords().finally(() => { pendingFetch = null; });
    const records = await pendingFetch;
    return NextResponse.json({ records, meta: { count: records.length, repo: REPO, fetchedAt: new Date().toISOString() } }, { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } });
  } catch (error) {
    console.error("[api/kelo/certifications] lecture impossible", error);
    return NextResponse.json({ error: error instanceof Error ? `Impossible de charger les certifications Kelo Social : ${error.message}` : "Impossible de charger les certifications Kelo Social.", records: cachedRecords || [] }, { status: cachedRecords ? 200 : 502, headers: { "Cache-Control": "private, max-age=5" } });
  }
}
