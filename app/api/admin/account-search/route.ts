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

type BlueskyVerificationState = {
  verifiedStatus?: "valid" | "invalid" | "none" | string;
  trustedVerifierStatus?: "valid" | "invalid" | "none" | string;
};

type SearchActor = {
  did?: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
  verification?: BlueskyVerificationState;
};

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
      actors?: SearchActor[];
    };

    const certificationsByDid = new Map<string, CertificationStatus>();
    for (const certification of certifications) {
      const did = normalizeDid(certification.subjectDid);
      const current = certificationsByDid.get(did);

      // Une fleur Kelo est prioritaire visuellement si le compte possède aussi
      // une certification ronde ou plusieurs records historiques.
      if (certification.status === "trusted-verifier" || !current) {
        certificationsByDid.set(did, certification.status);
      }
    }

    const actors = (data.actors || [])
      .filter((actor) => actor.did && actor.handle)
      .map((actor) => {
        const did = normalizeDid(actor.did!);
        const keloStatus = certificationsByDid.get(did) || null;

        const blueskyTrustedVerifier =
          actor.verification?.trustedVerifierStatus === "valid";
        const blueskyVerified =
          actor.verification?.verifiedStatus === "valid";

        // Fusion Kelo + Bluesky :
        // 1. toute fleur (Kelo ou Bluesky) est prioritaire ;
        // 2. sinon un compte vérifié sur Kelo ou Bluesky reçoit le rond ;
        // 3. sinon aucun badge.
        let certificationStatus: CertificationStatus | null = null;

        if (
          keloStatus === "trusted-verifier" ||
          blueskyTrustedVerifier
        ) {
          certificationStatus = "trusted-verifier";
        } else if (
          keloStatus === "certified" ||
          blueskyVerified
        ) {
          certificationStatus = "certified";
        }

        return {
          did: actor.did!,
          handle: actor.handle!,
          displayName: actor.displayName || actor.handle!,
          avatar: actor.avatar || null,
          certificationStatus,
          certificationSources: {
            kelo: keloStatus,
            bluesky: {
              verified: blueskyVerified,
              trustedVerifier: blueskyTrustedVerifier,
            },
          },
        };
      });

    return NextResponse.json({ actors });
  } catch (error) {
    console.error("[admin/account-search]", error);
    return NextResponse.json(
      { actors: [], error: "Recherche AT Protocol temporairement indisponible." },
      { status: 502 }
    );
  }
}
