import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";
import { followCertifiedProfile } from "@/lib/atproto/admin-follows";

const COLLECTION = "eu.kelosocial.certification";
const PDS_URL =
  process.env.KELO_ADMIN_PDS_URL?.trim() ||
  process.env.CERTIFICATION_REPO_PDS_URL?.trim() ||
  process.env.KELO_PDS_URL?.trim() ||
  "https://pds.kelosocial.eu";
const IDENTIFIER =
  process.env.KELO_ADMIN_ATPROTO_IDENTIFIER?.trim() ||
  process.env.CERTIFICATION_REPO_IDENTIFIER?.trim() ||
  "kelosocial.eu";
const PASSWORD =
  process.env.KELO_ADMIN_ATPROTO_PASSWORD?.trim() ||
  process.env.CERTIFICATION_REPO_APP_PASSWORD?.trim() ||
  "";

type Session = { accessJwt: string; refreshJwt?: string; pdsUrl: string; handle: string; did: string };

function norm(v: string) { return v.trim().toLowerCase(); }

function admins() {
  return (process.env.ADMIN_HANDLES || "").split(",").map(norm).filter(Boolean);
}

function adminDids() {
  return (process.env.ADMIN_DIDS || "").split(",").map(norm).filter(Boolean);
}

async function authenticate(session: Session) {
  const agent = new AtpAgent({ service: session.pdsUrl });
  await agent.resumeSession({
    accessJwt: session.accessJwt,
    refreshJwt: session.refreshJwt || "",
    active: true,
    handle: session.handle,
    did: session.did,
  });
  const current = await agent.api.com.atproto.server.getSession();
  const did = norm(current.data.did || "");
  const handle = norm(current.data.handle || "");
  if (did !== norm(session.did)) throw new Error("Session AT Protocol incohérente.");
  if (!adminDids().includes(did) && !admins().includes(handle)) throw new Error("Accès administrateur requis.");
}

async function getRepo() {
  if (!PASSWORD) throw new Error("Configuration du dépôt administrateur incomplète.");
  const agent = new AtpAgent({ service: PDS_URL });
  await agent.login({ identifier: IDENTIFIER, password: PASSWORD });
  if (!agent.session?.did) throw new Error("Dépôt administrateur indisponible.");
  return { agent, repoDid: norm(agent.session.did) };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = body?.session as Session | undefined;
    if (!session?.accessJwt || !session?.pdsUrl || !session?.did || !session?.handle) {
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }

    await authenticate(session);
    const { agent, repoDid } = await getRepo();

    let cursor: string | undefined;
    let certified = 0;
    let followed = 0;
    let alreadyFollowing = 0;

    do {
      const response = await agent.api.com.atproto.repo.listRecords({
        repo: repoDid,
        collection: COLLECTION,
        limit: 100,
        cursor,
      });

      for (const item of response.data.records) {
        const value = item.value as Record<string, unknown>;
        if (value.status !== "certified" || norm(String(value.issuerDid || "")) !== repoDid) continue;

        const subjectDid = norm(String(value.subjectDid || ""));
        if (!subjectDid || subjectDid === repoDid) continue;

        certified++;
        const action = await followCertifiedProfile(agent, repoDid, subjectDid);
        if (action === "followed") followed++;
        if (action === "already-following") alreadyFollowing++;
      }

      cursor = response.data.cursor;
    } while (cursor);

    return NextResponse.json({ success: true, certified, followed, alreadyFollowing });
  } catch (error) {
    console.error("[admin/certification-follows]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de synchroniser les abonnements." },
      { status: 500 }
    );
  }
}
