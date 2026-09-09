import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

const LOGIN_ACTIVITY_COLLECTION = "eu.kelosocial.loginactivity";
const REPO_IDENTIFIER =
  process.env.KELO_ADMIN_ATPROTO_IDENTIFIER?.trim() ||
  process.env.CERTIFICATION_REPO_IDENTIFIER?.trim() ||
  "kelosocial.eu";
const REPO_PDS_URL =
  process.env.KELO_ADMIN_PDS_URL?.trim() ||
  process.env.CERTIFICATION_REPO_PDS_URL?.trim() ||
  process.env.KELO_PDS_URL?.trim() ||
  "https://pds.kelosocial.eu";
const REPO_APP_PASSWORD =
  process.env.KELO_ADMIN_ATPROTO_PASSWORD?.trim() ||
  process.env.CERTIFICATION_REPO_APP_PASSWORD?.trim() ||
  "";
const BLUESKY_ENTRYWAY_URL = "https://bsky.social";

type LoginMethod = "password" | "qr-kelo-id";

type RequestSession = {
  accessJwt: string;
  refreshJwt?: string;
  pdsUrl: string;
  handle: string;
  did: string;
};

function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function normalizeDid(value: string) {
  return value.trim().toLowerCase();
}

function isValidSession(value: unknown): value is RequestSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<RequestSession>;
  return Boolean(
    session.accessJwt && session.pdsUrl && session.handle && session.did
  );
}

function normalizeService(value: string) {
  return value.trim().replace(/\/$/, "");
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function assertSafePdsService(value: string) {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (url.protocol !== "https:") {
    throw new Error("Le PDS doit utiliser HTTPS.");
  }
  if (url.username || url.password) {
    throw new Error("URL de PDS invalide.");
  }
  if (url.port && url.port !== "443") {
    throw new Error("Port de PDS non autorisé.");
  }
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "::1" ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    hostname.startsWith("fe80:") ||
    isPrivateIpv4(hostname)
  ) {
    throw new Error("Adresse de PDS privée ou locale interdite.");
  }
}

function getSessionVerificationServices(pdsUrl: string): string[] {
  const normalized = normalizeService(pdsUrl);
  assertSafePdsService(normalized);
  const services = [normalized];

  const hostname = new URL(normalized).hostname.toLowerCase();
  if (hostname === "bsky.social" || hostname.endsWith(".host.bsky.network")) {
    services.unshift(BLUESKY_ENTRYWAY_URL);
  }

  return Array.from(new Set(services));
}

async function verifySession(session: RequestSession) {
  let lastError: unknown = null;

  for (const service of getSessionVerificationServices(session.pdsUrl)) {
    try {
      const agent = new AtpAgent({ service });
      await agent.resumeSession({
        accessJwt: session.accessJwt,
        refreshJwt: session.refreshJwt || "",
        active: true,
        handle: session.handle,
        did: session.did,
      });
      const current = await agent.api.com.atproto.server.getSession();
      const did = normalizeDid(current.data.did || "");
      const handle = normalizeHandle(current.data.handle || "");

      if (did && did === normalizeDid(session.did)) {
        return { did, handle };
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Impossible de vérifier la session AT Protocol.");
}

async function getCentralRepo() {
  if (!REPO_APP_PASSWORD) {
    throw new Error("KELO_ADMIN_ATPROTO_PASSWORD est manquant.");
  }
  const agent = new AtpAgent({ service: REPO_PDS_URL });
  await agent.login({ identifier: REPO_IDENTIFIER, password: REPO_APP_PASSWORD });
  if (!agent.session?.did) throw new Error("Dépôt central indisponible.");
  return { agent, repoDid: agent.session.did };
}

function detectDevice(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablette";
  if (/android|iphone|mobile/.test(ua)) return "mobile";
  return "ordinateur";
}

function makeRecordKey(did: string) {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  const suffix = normalizeDid(did).replace(/[^a-z0-9]/g, "").slice(-8);
  return `${time}-${random}-${suffix}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = body?.session;
    const method = body?.method as LoginMethod;

    if (!isValidSession(session)) {
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }
    if (method !== "password" && method !== "qr-kelo-id") {
      return NextResponse.json({ error: "Méthode de connexion invalide." }, { status: 400 });
    }

    const verified = await verifySession(session);
    if (!verified.did || !verified.handle) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 401 });
    }

    const { agent, repoDid } = await getCentralRepo();
    const connectedAt = new Date().toISOString();
    const device = detectDevice(request.headers.get("user-agent") || "");

    const result = await agent.api.com.atproto.repo.putRecord({
      repo: repoDid,
      collection: LOGIN_ACTIVITY_COLLECTION,
      rkey: makeRecordKey(verified.did),
      validate: false,
      record: {
        $type: LOGIN_ACTIVITY_COLLECTION,
        subjectDid: verified.did,
        subjectHandle: verified.handle,
        pdsUrl: normalizeService(session.pdsUrl),
        method,
        device,
        connectedAt,
      },
    });

    return NextResponse.json({
      success: true,
      uri: result.data.uri,
      connectedAt,
    });
  } catch (error) {
    console.error("[login-activity]", error);
    return NextResponse.json(
      { error: "Impossible d’enregistrer la connexion." },
      { status: 500 }
    );
  }
}
