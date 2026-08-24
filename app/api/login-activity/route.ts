import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

const LOGIN_ACTIVITY_COLLECTION = "eu.kelosocial.loginactivity";
const REPO_IDENTIFIER = process.env.CERTIFICATION_REPO_IDENTIFIER?.trim() || "kelosocial.eu";
const REPO_PDS_URL = process.env.CERTIFICATION_REPO_PDS_URL?.trim() || "https://eurosky.social";
const REPO_APP_PASSWORD = process.env.CERTIFICATION_REPO_APP_PASSWORD?.trim() || "";
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

function getSessionVerificationServices(pdsUrl: string): string[] {
  const normalized = normalizeService(pdsUrl);
  const services = [normalized];

  try {
    const hostname = new URL(normalized).hostname.toLowerCase();
    if (hostname === "bsky.social" || hostname.endsWith(".host.bsky.network")) {
      services.unshift(BLUESKY_ENTRYWAY_URL);
    }
  } catch {}

  return [...new Set(services)];
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
    throw new Error("CERTIFICATION_REPO_APP_PASSWORD est manquant.");
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
        pdsUrl: session.pdsUrl,
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
      {
        error:
          error instanceof Error
            ? `Impossible d’enregistrer la connexion : ${error.message}`
            : "Impossible d’enregistrer la connexion.",
      },
      { status: 500 }
    );
  }
}
