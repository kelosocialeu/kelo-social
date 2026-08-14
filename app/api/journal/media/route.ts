import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

const COLLECTION = "eu.kelosocial.journalmedia";
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

type JournalMedia = {
  rkey: string;
  did: string;
  handle: string;
  displayName: string;
  international: boolean;
  continents: string[];
  countries: string[];
  addedAt: string;
};

function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function normalizeDid(value: string) {
  return value.trim().toLowerCase();
}

function cleanTags(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map((value) => String(value).trim()).filter(Boolean))).slice(0, 50);
}

function isValidSession(value: unknown): value is RequestSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<RequestSession>;
  return Boolean(session.accessJwt && session.pdsUrl && session.handle && session.did);
}

function getAdminHandles() {
  return (process.env.ADMIN_HANDLES || "").split(",").map(normalizeHandle).filter(Boolean);
}

function getAdminDids() {
  return (process.env.ADMIN_DIDS || "").split(",").map(normalizeDid).filter(Boolean);
}

async function authenticateAdmin(session: RequestSession) {
  const agent = new AtpAgent({ service: session.pdsUrl });
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
  return getAdminDids().includes(did) || getAdminHandles().includes(handle);
}

async function getCentralRepo() {
  if (!REPO_APP_PASSWORD) throw new Error("CERTIFICATION_REPO_APP_PASSWORD est manquant.");
  const agent = new AtpAgent({ service: REPO_PDS_URL });
  await agent.login({ identifier: REPO_IDENTIFIER, password: REPO_APP_PASSWORD });
  if (!agent.session?.did) throw new Error("Dépôt central indisponible.");
  return { agent, repoDid: agent.session.did };
}

async function listMedia(agent: AtpAgent, repoDid: string): Promise<JournalMedia[]> {
  const items: JournalMedia[] = [];
  let cursor: string | undefined;

  do {
    const response = await agent.api.com.atproto.repo.listRecords({
      repo: repoDid,
      collection: COLLECTION,
      limit: 100,
      cursor,
    });

    for (const item of response.data.records) {
      const value = item.value as Record<string, unknown>;
      if (typeof value.did !== "string" || typeof value.handle !== "string") continue;
      items.push({
        rkey: item.uri.split("/").pop() || "",
        did: normalizeDid(value.did),
        handle: normalizeHandle(value.handle),
        displayName: typeof value.displayName === "string" ? value.displayName : normalizeHandle(value.handle),
        international: value.international === true,
        continents: cleanTags(value.continents),
        countries: cleanTags(value.countries),
        addedAt: typeof value.addedAt === "string" ? value.addedAt : "",
      });
    }

    cursor = response.data.cursor;
  } while (cursor && items.length < 500);

  return items.sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));
}

export async function GET() {
  try {
    const { agent, repoDid } = await getCentralRepo();
    return NextResponse.json({ media: await listMedia(agent, repoDid) });
  } catch (error) {
    console.error("[journal/media GET]", error);
    return NextResponse.json({ error: "Impossible de charger les médias du Journal." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = body?.session;
    if (!isValidSession(session) || !(await authenticateAdmin(session))) {
      return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
    }

    const { agent, repoDid } = await getCentralRepo();
    const action = body?.action;

    if (action === "remove") {
      const rkey = String(body?.rkey || "").trim();
      if (!rkey) return NextResponse.json({ error: "Média invalide." }, { status: 400 });
      await agent.api.com.atproto.repo.deleteRecord({ repo: repoDid, collection: COLLECTION, rkey });
      return NextResponse.json({ success: true });
    }

    if (action !== "add") {
      return NextResponse.json({ error: "Action invalide." }, { status: 400 });
    }

    const actor = normalizeHandle(String(body?.handle || ""));
    if (!actor) return NextResponse.json({ error: "Handle du média requis." }, { status: 400 });

    const publicAgent = new AtpAgent({ service: "https://public.api.bsky.app" });
    const profile = await publicAgent.api.app.bsky.actor.getProfile({ actor });
    const existing = await listMedia(agent, repoDid);
    if (existing.some((item) => item.did === normalizeDid(profile.data.did))) {
      return NextResponse.json({ error: "Ce média est déjà présent dans le Journal." }, { status: 409 });
    }

    const international = body?.international === true;
    const continents = cleanTags(body?.continents);
    const countries = cleanTags(body?.countries);
    if (!international && continents.length === 0 && countries.length === 0) {
      return NextResponse.json({ error: "Choisissez au moins International, un continent ou un pays." }, { status: 400 });
    }

    await agent.api.com.atproto.repo.createRecord({
      repo: repoDid,
      collection: COLLECTION,
      validate: false,
      record: {
        $type: COLLECTION,
        did: profile.data.did,
        handle: profile.data.handle,
        displayName: profile.data.displayName || profile.data.handle,
        international,
        continents,
        countries,
        addedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[journal/media POST]", error);
    return NextResponse.json({ error: "Impossible de modifier les médias du Journal." }, { status: 500 });
  }
}
