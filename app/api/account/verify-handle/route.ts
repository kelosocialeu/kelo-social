import { NextRequest, NextResponse } from "next/server";
import { resolveTxt } from "node:dns/promises";

function normalizeDomain(value: unknown): string {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^@/, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

function isValidDomain(domain: string): boolean {
  return (
    domain.length > 3 &&
    domain.length <= 253 &&
    domain.includes(".") &&
    /^[a-z0-9.-]+$/.test(domain) &&
    !domain.startsWith(".") &&
    !domain.endsWith(".") &&
    !domain.includes("..")
  );
}

async function verifyDns(domain: string, did: string): Promise<boolean> {
  try {
    const records = await resolveTxt(`_atproto.${domain}`);
    return records.some((parts) => parts.join("").trim() === `did=${did}`);
  } catch {
    return false;
  }
}

async function verifyWellKnown(domain: string, did: string): Promise<boolean> {
  try {
    const response = await fetch(`https://${domain}/.well-known/atproto-did`, {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "text/plain" },
    });

    if (!response.ok) return false;
    const body = (await response.text()).trim();
    return body === did;
  } catch {
    return false;
  }
}

async function resolveAtprotoHandle(domain: string): Promise<string | null> {
  try {
    const url = new URL(
      "https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle"
    );
    url.searchParams.set("handle", domain);

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return null;
    const data = await response.json();
    return typeof data?.did === "string" ? data.did : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const domain = normalizeDomain(body?.domain);
    const did = String(body?.did || "").trim();
    const method = body?.method === "web" ? "web" : "dns";

    if (!isValidDomain(domain) || !did.startsWith("did:")) {
      return NextResponse.json(
        { ok: false, verified: false, available: false, error: "Domaine ou DID invalide." },
        { status: 400 }
      );
    }

    const ownershipVerified =
      method === "dns"
        ? await verifyDns(domain, did)
        : await verifyWellKnown(domain, did);

    if (!ownershipVerified) {
      return NextResponse.json({
        ok: true,
        verified: false,
        available: false,
        ownershipVerified: false,
        resolvedDid: null,
        reason:
          method === "dns"
            ? "L’enregistrement TXT _atproto ne pointe pas encore vers votre DID."
            : "Le fichier .well-known/atproto-did ne contient pas encore votre DID.",
      });
    }

    const resolvedDid = await resolveAtprotoHandle(domain);
    const protocolVerified = resolvedDid === did;

    if (!protocolVerified) {
      return NextResponse.json({
        ok: true,
        verified: false,
        available: false,
        ownershipVerified: true,
        resolvedDid,
        reason: resolvedDid
          ? "Ce domaine se résout actuellement vers un autre compte AT Protocol."
          : "L’enregistrement est correct mais AT Protocol ne le résout pas encore. La propagation peut prendre quelques minutes.",
      });
    }

    return NextResponse.json({
      ok: true,
      verified: true,
      available: true,
      ownershipVerified: true,
      resolvedDid,
      reason: null,
    });
  } catch (error) {
    console.error("Custom handle verification failed:", error);
    return NextResponse.json(
      { ok: false, verified: false, available: false, error: "Impossible de vérifier ce domaine pour le moment." },
      { status: 500 }
    );
  }
}
