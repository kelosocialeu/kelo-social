import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

const LOGIN_ACTIVITY_COLLECTION = "eu.kelosocial.loginactivity";
const REPO_IDENTIFIER = process.env.CERTIFICATION_REPO_IDENTIFIER?.trim() || "kelosocial.eu";
const REPO_PDS_URL = process.env.CERTIFICATION_REPO_PDS_URL?.trim() || "https://eurosky.social";
const REPO_APP_PASSWORD = process.env.CERTIFICATION_REPO_APP_PASSWORD?.trim() || "";

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

async function verifySession(session: RequestSession) {
  const agent = new AtpAgent({ service: session.pdsUrl });
  await agent.resumeSession({
    accessJwt: session.accessJwt,
    refreshJwt: session.refreshJwt || "",
    active: true,
    handle: session.handle,
    did: session.did,
  });
  const current = await agent.api.com.atproto.server.getSession();
  return {
    did: normalizeDid(current.data.did || ""),
    handle: normalizeHandle(current.data.handle || ""),
  };
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

    await agent.api.com.atproto.repo.createRecord({
      repo: repoDid,
      collection: LOGIN_ACTIVITY_COLLECTION,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[login-activity]", error);
    return NextResponse.json({ error: "Impossible d’enregistrer la connexion." }, { status: 500 });
  }
}
