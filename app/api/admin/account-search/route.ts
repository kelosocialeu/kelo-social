import { NextRequest, NextResponse } from "next/server";

import {
  listCertifications,
  type CertificationStatus,
} from "@/lib/atproto/certifications";

const APPVIEW_SEARCH_URL =
  "https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead";

function cleanQuery(value: string) {
  return value.trim().replace(/^@/, "").slice(0, 100);
}

function normalizeDid(value: string) {
  return value.trim().toLowerCase();
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

    const [response, certifications] = await Promise.all([
      fetch(url.toString(), {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }),
      listCertifications().catch((error) => {
        console.error("[admin/account-search] certifications", error);
        return [];
      }),
    ]);

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

    const certificationsByDid = new Map<string, CertificationStatus>();
    for (const certification of certifications) {
      const did = normalizeDid(certification.subjectDid);
      const current = certificationsByDid.get(did);

      // Une fleur est prioritaire visuellement si un compte possède aussi
      // une ancienne certification ronde ou plusieurs records historiques.
      if (certification.status === "trusted-verifier" || !current) {
        certificationsByDid.set(did, certification.status);
      }
    }

    const actors = (data.actors || [])
      .filter((actor) => actor.did && actor.handle)
      .map((actor) => ({
        did: actor.did!,
        handle: actor.handle!,
        displayName: actor.displayName || actor.handle!,
        avatar: actor.avatar || null,
        certificationStatus:
          certificationsByDid.get(normalizeDid(actor.did!)) || null,
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
