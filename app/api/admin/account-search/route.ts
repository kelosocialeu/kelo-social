import { NextRequest, NextResponse } from "next/server";

import {
  listCertifications,
  type CertificationStatus,
} from "@/lib/atproto/certifications";
import { listCertificationSuppressions } from "@/lib/atproto/certification-suppressions";

const APPVIEW_BASE_URL = "https://public.api.bsky.app/xrpc";
const SEARCH_URL = `${APPVIEW_BASE_URL}/app.bsky.actor.searchActors`;
const TYPEAHEAD_URL = `${APPVIEW_BASE_URL}/app.bsky.actor.searchActorsTypeahead`;
const PROFILE_URL = `${APPVIEW_BASE_URL}/app.bsky.actor.getProfile`;

function cleanQuery(value: string) {
  return value.trim().replace(/^@/, "").slice(0, 100);
}

function normalizeDid(value: string) {
  return value.trim().toLowerCase();
}

function looksLikeHandle(value: string) {
  return value.includes(".") && !/\s/.test(value);
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

async function fetchJson(url: URL) {
  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`AppView request failed (${response.status})`);
  }

  return response.json();
}

async function searchActors(query: string): Promise<SearchActor[]> {
  const searchUrl = new URL(SEARCH_URL);
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("limit", "25");

  const typeaheadUrl = new URL(TYPEAHEAD_URL);
  typeaheadUrl.searchParams.set("q", query);
  typeaheadUrl.searchParams.set("limit", "10");

  const requests: Promise<any>[] = [fetchJson(searchUrl), fetchJson(typeaheadUrl)];

  if (looksLikeHandle(query)) {
    const profileUrl = new URL(PROFILE_URL);
    profileUrl.searchParams.set("actor", query);
    requests.push(fetchJson(profileUrl).catch(() => null));
  }

  const [searchData, typeaheadData, exactProfile] = await Promise.all(requests);
  const byDid = new Map<string, SearchActor>();

  const addActor = (actor?: SearchActor | null) => {
    if (!actor?.did || !actor.handle) return;
    const existing = byDid.get(actor.did);
    byDid.set(actor.did, {
      ...existing,
      ...actor,
      avatar: actor.avatar || existing?.avatar,
      displayName: actor.displayName || existing?.displayName || actor.handle,
    });
  };

  if (exactProfile) addActor(exactProfile as SearchActor);
  for (const actor of (typeaheadData?.actors || []) as SearchActor[]) addActor(actor);
  for (const actor of (searchData?.actors || []) as SearchActor[]) addActor(actor);

  const normalizedQuery = query.toLowerCase();
  return Array.from(byDid.values())
    .sort((a, b) => {
      const aHandle = (a.handle || "").toLowerCase();
      const bHandle = (b.handle || "").toLowerCase();
      const aName = (a.displayName || "").toLowerCase();
      const bName = (b.displayName || "").toLowerCase();

      const score = (handle: string, name: string) => {
        if (handle === normalizedQuery) return 0;
        if (handle.startsWith(normalizedQuery)) return 1;
        if (name.startsWith(normalizedQuery)) return 2;
        if (handle.includes(normalizedQuery)) return 3;
        if (name.includes(normalizedQuery)) return 4;
        return 5;
      };

      return score(aHandle, aName) - score(bHandle, bName);
    })
    .slice(0, 25);
}

export async function GET(request: NextRequest) {
  const query = cleanQuery(request.nextUrl.searchParams.get("q") || "");

  if (query.length < 2) {
    return NextResponse.json({ actors: [] });
  }

  try {
    const [searchedActors, certifications, suppressions] = await Promise.all([
      searchActors(query),
      listCertifications().catch((error) => {
        console.error("[admin/account-search] certifications", error);
        return [];
      }),
      listCertificationSuppressions().catch((error) => {
        console.error("[admin/account-search] suppressions", error);
        return [];
      }),
    ]);

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

    const actors = searchedActors.map((actor) => {
      const did = normalizeDid(actor.did!);
      const keloStatus = certificationsByDid.get(did) || null;
      const hiddenOnKelo = suppressedDids.has(did);

      const blueskyTrustedVerifier =
        actor.verification?.trustedVerifierStatus === "valid";
      const blueskyVerified = actor.verification?.verifiedStatus === "valid";

      let sourceCertificationStatus: CertificationStatus | null = null;

      if (keloStatus === "trusted-verifier" || blueskyTrustedVerifier) {
        sourceCertificationStatus = "trusted-verifier";
      } else if (keloStatus === "certified" || blueskyVerified) {
        sourceCertificationStatus = "certified";
      }

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
