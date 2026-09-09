import { NextRequest, NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

const ROBOT_COLLECTION = "eu.kelosocial.robotaccount";
const ROBOT_GET_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
};
const CERTIFICATION_REPO_IDENTIFIER =
  process.env.CERTIFICATION_REPO_IDENTIFIER?.trim() ||
  process.env.KELO_ADMIN_ATPROTO_IDENTIFIER?.trim() ||
  "kelosocial.eu";
const CERTIFICATION_REPO_PDS_URL =
  process.env.CERTIFICATION_REPO_PDS_URL?.trim() ||
  process.env.KELO_ADMIN_PDS_URL?.trim() ||
  "https://eurosky.social";
const CERTIFICATION_REPO_APP_PASSWORD =
  process.env.CERTIFICATION_REPO_APP_PASSWORD?.trim() ||
  process.env.KELO_ADMIN_ATPROTO_PASSWORD?.trim() ||
  "";

interface RequestSession {
  accessJwt: string;
  refreshJwt?: string;
  pdsUrl: string;
  handle: string;
  did: string;
}

function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function normalizeDid(value: string) {
  return value.trim().toLowerCase();
}

function robotRecordKey(did: string) {
  return normalizeDid(did).replace(/[^a-z0-9._~-]/g, "_");
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

function isAdmin(did: string, handle: string) {
  const dids = getAdminDids();
  if (dids.length > 0) return dids.includes(normalizeDid(did));
  return getAdminHandles().includes(normalizeHandle(handle));
}

function isValidSession(value: unknown): value is RequestSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<RequestSession>;
  return (
    typeof session.accessJwt === "string" && !!session.accessJwt &&
    typeof session.pdsUrl === "string" && !!session.pdsUrl &&
    typeof session.handle === "string" && !!session.handle &&
    typeof session.did === "string" && !!session.did
  );
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
  const response = await agent.api.com.atproto.server.getSession();
  const did = normalizeDid(response.data.did || "");
  const handle = normalizeHandle(response.data.handle || "");
  if (!did || did !== normalizeDid(session.did)) {
    throw new Error("Session AT Protocol incohérente.");
  }
  return { did, handle };
}

async function authenticateCentralRepo() {
  if (!CERTIFICATION_REPO_APP_PASSWORD) {
    throw new Error("Configuration du dépôt Kelo incomplète.");
  }
  const agent = new AtpAgent({ service: CERTIFICATION_REPO_PDS_URL });
  await agent.login({
    identifier: CERTIFICATION_REPO_IDENTIFIER,
    password: CERTIFICATION_REPO_APP_PASSWORD,
  });
  if (!agent.session?.did) throw new Error("Dépôt Kelo inaccessible.");
  return { agent, repoDid: normalizeDid(agent.session.did) };
}

function hasRobotLabel(labels: unknown): boolean {
  if (!Array.isArray(labels)) return false;
  return labels.some((label) => {
    if (!label || typeof label !== "object") return false;
    const val = String((label as Record<string, unknown>).val || "").toLowerCase();
    return ["bot", "automated", "automated-account", "robot"].includes(val);
  });
}

async function getAtprotoRobotState(actor: string) {
  try {
    const url = new URL("https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile");
    url.searchParams.set("actor", actor);
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const profile = await response.json();
    return hasRobotLabel(profile?.labels);
  } catch {
    return false;
  }
}

async function getKeloRobotState(did: string) {
  if (!did) return false;
  try {
    const url = new URL(`${CERTIFICATION_REPO_PDS_URL}/xrpc/com.atproto.repo.getRecord`);
    url.searchParams.set("repo", CERTIFICATION_REPO_IDENTIFIER);
    url.searchParams.set("collection", ROBOT_COLLECTION);
    url.searchParams.set("rkey", robotRecordKey(did));
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const did = normalizeDid(request.nextUrl.searchParams.get("did") || "");
  const handle = normalizeHandle(request.nextUrl.searchParams.get("handle") || "");
  const actor = did || handle;
  if (!actor) {
    return NextResponse.json({ robot: false, kelo: false, atproto: false, source: null });
  }

  const [kelo, atproto] = await Promise.all([
    did ? getKeloRobotState(did) : Promise.resolve(false),
    getAtprotoRobotState(actor),
  ]);

  return NextResponse.json(
    {
      robot: kelo || atproto,
      kelo,
      atproto,
      source: kelo ? "kelo" : atproto ? "atproto" : null,
      synchronized: atproto,
    },
    { headers: ROBOT_GET_CACHE_HEADERS }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = body?.session;
    const enabled = body?.enabled === true;

    if (!isValidSession(session)) {
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }

    const requester = await authenticateRequester(session);
    const admin = isAdmin(requester.did, requester.handle);

    const requestedHandle = normalizeHandle(String(body?.targetHandle || requester.handle));
    const requestedDid = normalizeDid(String(body?.targetDid || requester.did));

    const editingSelf =
      (!requestedDid || requestedDid === requester.did) &&
      (!requestedHandle || requestedHandle === requester.handle);

    if (!editingSelf && !admin) {
      return NextResponse.json(
        { error: "Vous pouvez uniquement modifier le statut robot de votre propre compte." },
        { status: 403 }
      );
    }

    const central = await authenticateCentralRepo();
    let targetHandle = editingSelf ? requester.handle : requestedHandle;
    let targetDid = editingSelf ? requester.did : requestedDid;

    if (!targetHandle) {
      return NextResponse.json({ error: "Compte cible manquant." }, { status: 400 });
    }

    if (!targetDid.startsWith("did:")) {
      const resolved = await central.agent.api.com.atproto.identity.resolveHandle({ handle: targetHandle });
      targetDid = normalizeDid(resolved.data.did || "");
    }
    if (!targetDid.startsWith("did:")) {
      return NextResponse.json({ error: "DID du compte introuvable." }, { status: 404 });
    }

    const rkey = robotRecordKey(targetDid);
    if (!enabled) {
      try {
        await central.agent.api.com.atproto.repo.deleteRecord({
          repo: central.repoDid,
          collection: ROBOT_COLLECTION,
          rkey,
        });
      } catch {}

      const atproto = await getAtprotoRobotState(targetDid);
      return NextResponse.json({
        success: true,
        robot: atproto,
        kelo: false,
        atproto,
        synchronized: atproto,
        targetDid,
        targetHandle,
      });
    }

    await central.agent.api.com.atproto.repo.putRecord({
      repo: central.repoDid,
      collection: ROBOT_COLLECTION,
      rkey,
      record: {
        $type: ROBOT_COLLECTION,
        subjectDid: targetDid,
        subjectHandle: targetHandle,
        enabled: true,
        updatedAt: new Date().toISOString(),
        updatedByDid: requester.did,
        selfDeclared: editingSelf,
      },
      validate: false,
    });

    const atproto = await getAtprotoRobotState(targetDid);
    return NextResponse.json({
      success: true,
      robot: true,
      kelo: true,
      atproto,
      synchronized: atproto,
      targetDid,
      targetHandle,
    });
  } catch (error) {
    console.error("[kelo/robot-status]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de modifier le statut robot." },
      { status: 500 }
    );
  }
}
