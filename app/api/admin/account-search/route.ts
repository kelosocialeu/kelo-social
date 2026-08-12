import { NextRequest, NextResponse } from "next/server";

import {
  listCertifications,
  type CertificationStatus,
} from "@/lib/atproto/certifications";
import { listCertificationSuppressions } from "@/lib/atproto/certification-suppressions";

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

    const [response, certifications, suppressions] = await Promise.all([
      fetch(url.toString(), {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }),
      listCertifications().catch((error) => {
        console.error("[admin/account-search] certifications", error);
        return [];
      }),
      listCertificationSuppressions().catch((error) => {
        console.error("[admin/account-search] suppressions", error);
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

      if (certification.status === "trusted-verifier" || !current) {
        certificationsByDid.set(did, certification.status);
      }
    }

    const suppressedDids = new Set(
      suppressions.map((suppression) => normalizeDid(suppression.subjectDid))
    );

    const actors = (data.actors || [])
      .filter((actor) => actor.did && actor.handle)
      .map((actor) => {
        const did = normalizeDid(actor.did!);
        const keloStatus = certificationsByDid.get(did) || null;
        const hiddenOnKelo = suppressedDids.has(did);

        const blueskyTrustedVerifier =
          actor.verification?.trustedVerifierStatus === "valid";
        const blueskyVerified =
          actor.verification?.verifiedStatus === "valid";

        let sourceCertificationStatus: CertificationStatus | null = null;

        if (keloStatus === "trusted-verifier" || blueskyTrustedVerifier) {
          sourceCertificationStatus = "trusted-verifier";
        } else if (keloStatus === "certified" || blueskyVerified) {
          sourceCertificationStatus = "certified";
        }

        // "none" est volontairement explicite : l'admin sait qu'une décision
        // Kelo existe et ne retombe pas sur l'ancien fallback de certifications.
        // Le statut source reste disponible séparément et n'est jamais modifié.
        const certificationStatus: CertificationStatus | "none" | null =
          hiddenOnKelo ? "none" : sourceCertificationStatus;

        return {
          did: actor.did!,
          handle: actor.handle!,
          displayName: actor.displayName || actor.handle!,
          avatar: actor.avatar || null,
          certificationStatus,
          sourceCertificationStatus,
          hiddenOnKelo,
          certificationSources: {
            kelo: keloStatus,
            atproto: {
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
