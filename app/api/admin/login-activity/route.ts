import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

const LOGIN_ACTIVITY_COLLECTION = "eu.kelosocial.loginactivity";
const REPO_IDENTIFIER = process.env.CERTIFICATION_REPO_IDENTIFIER?.trim() || "kelosocial.eu";
const REPO_PDS_URL = process.env.CERTIFICATION_REPO_PDS_URL?.trim() || "https://eurosky.social";
const REPO_APP_PASSWORD = process.env.CERTIFICATION_REPO_APP_PASSWORD?.trim() || "";

type RequestSession = {
  accessJwt: string;
  refreshJwt?: string;
  pdsUrl: string;
  handle: string;
  did: string;
};

type LoginActivityRecord = {
  subjectDid: string;
  subjectHandle: string;
  pdsUrl: string;
  method: "password" | "qr-kelo-id";
  device: string;
  connectedAt: string;
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
  return Boolean(session.accessJwt && session.pdsUrl && session.handle && session.did);
}

function getAdminHandles() {
  return (process.env.ADMIN_HANDLES || "")
    .split(",")
    .map(normalizeHandle)
    .filter(Boolean);
}

function getAdminDids() {
  return (process.env.ADMIN_DIDS || "")
    .split(",")
    .map(normalizeDid)
    .filter(Boolean);
}

async function authenticateRequester(session: RequestSession) {
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
  if (!REPO_APP_PASSWORD) throw new Error("CERTIFICATION_REPO_APP_PASSWORD est manquant.");
  const agent = new AtpAgent({ service: REPO_PDS_URL });
  await agent.login({ identifier: REPO_IDENTIFIER, password: REPO_APP_PASSWORD });
  if (!agent.session?.did) throw new Error("Dépôt central indisponible.");
  return { agent, repoDid: agent.session.did };
}

function parseRecord(value: unknown): LoginActivityRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.subjectDid !== "string" ||
    typeof record.subjectHandle !== "string" ||
    typeof record.pdsUrl !== "string" ||
    (record.method !== "password" && record.method !== "qr-kelo-id") ||
    typeof record.device !== "string" ||
    typeof record.connectedAt !== "string"
  ) return null;

  return {
    subjectDid: normalizeDid(record.subjectDid),
    subjectHandle: normalizeHandle(record.subjectHandle),
    pdsUrl: record.pdsUrl,
    method: record.method,
    device: record.device,
    connectedAt: record.connectedAt,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = body?.session;
    if (!isValidSession(session)) {
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }

    const requester = await authenticateRequester(session);
    const isAdmin =
      getAdminDids().includes(requester.did) ||
      getAdminHandles().includes(requester.handle);

    if (!isAdmin) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const { agent, repoDid } = await getCentralRepo();
    const records: LoginActivityRecord[] = [];
    let cursor: string | undefined;

    do {
      const response = await agent.api.com.atproto.repo.listRecords({
        repo: repoDid,
        collection: LOGIN_ACTIVITY_COLLECTION,
        limit: 100,
        cursor,
      });

      for (const item of response.data.records) {
        const parsed = parseRecord(item.value);
        if (parsed) records.push(parsed);
      }

      cursor = response.data.cursor;
    } while (cursor && records.length < 500);

    records.sort((a, b) =>
      new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime()
    );

    return NextResponse.json({ records: records.slice(0, 500) });
  } catch (error) {
    console.error("[admin/login-activity]", error);
    return NextResponse.json({ error: "Impossible de charger les connexions." }, { status: 500 });
  }
}
