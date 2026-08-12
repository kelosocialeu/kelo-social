import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

import { CERTIFICATION_SUPPRESSION_COLLECTION } from "@/lib/atproto/certification-suppressions";

type RequestSession = {
  accessJwt: string;
  refreshJwt?: string;
  pdsUrl: string;
  handle: string;
  did: string;
};

const CERTIFICATION_REPO_IDENTIFIER =
  process.env.CERTIFICATION_REPO_IDENTIFIER?.trim() || "kelosocial.eu";
const CERTIFICATION_REPO_PDS_URL =
  process.env.CERTIFICATION_REPO_PDS_URL?.trim() || "https://eurosky.social";
const CERTIFICATION_REPO_APP_PASSWORD =
  process.env.CERTIFICATION_REPO_APP_PASSWORD?.trim() || "";

function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function normalizeDid(value: string) {
  return value.trim().toLowerCase();
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

function isValidSession(value: unknown): value is RequestSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<RequestSession>;
  return Boolean(
    session.accessJwt &&
      session.pdsUrl &&
      session.handle &&
      session.did
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
  return {
    did: normalizeDid(response.data.did || ""),
    handle: normalizeHandle(response.data.handle || ""),
  };
}

function isMainAdmin(did: string, handle: string) {
  return (
    getAdminDids().includes(normalizeDid(did)) ||
    getAdminHandles().includes(normalizeHandle(handle))
  );
}

async function authenticatePolicyRepo() {
  if (!CERTIFICATION_REPO_APP_PASSWORD) {
    throw new Error(
      "Configuration serveur incomplète : CERTIFICATION_REPO_APP_PASSWORD est manquant."
    );
  }

  const agent = new AtpAgent({ service: CERTIFICATION_REPO_PDS_URL });
  await agent.login({
    identifier: CERTIFICATION_REPO_IDENTIFIER,
    password: CERTIFICATION_REPO_APP_PASSWORD,
  });

  if (!agent.session?.did) {
    throw new Error("Impossible d’authentifier le dépôt de politique Kelo Social.");
  }

  return {
    agent,
    repoDid: normalizeDid(agent.session.did),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = body?.session;
    const subjectDid =
      typeof body?.subjectDid === "string" ? normalizeDid(body.subjectDid) : "";
    const subjectHandle =
      typeof body?.subjectHandle === "string"
        ? normalizeHandle(body.subjectHandle)
        : "";
    const hidden = body?.hidden;

    if (!isValidSession(session)) {
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }

    if (!subjectDid || typeof hidden !== "boolean") {
      return NextResponse.json(
        { error: "DID cible ou action de visibilité manquante." },
        { status: 400 }
      );
    }

    const requester = await authenticateRequester(session);
    if (!isMainAdmin(requester.did, requester.handle)) {
      return NextResponse.json(
        { error: "Seul l’administrateur Kelo Social peut modifier la visibilité locale des certifications." },
        { status: 403 }
      );
    }

    const policyRepo = await authenticatePolicyRepo();

    if (!hidden) {
      try {
        await policyRepo.agent.api.com.atproto.repo.deleteRecord({
          repo: policyRepo.repoDid,
          collection: CERTIFICATION_SUPPRESSION_COLLECTION,
          rkey: subjectDid,
        });
      } catch {
        // Une absence de record signifie déjà « visible ».
      }

      return NextResponse.json({
        success: true,
        action: "visible-on-kelo",
        subjectDid,
        subjectHandle,
      });
    }

    const hiddenAt = new Date().toISOString();
    await policyRepo.agent.api.com.atproto.repo.putRecord({
      repo: policyRepo.repoDid,
      collection: CERTIFICATION_SUPPRESSION_COLLECTION,
      rkey: subjectDid,
      record: {
        $type: CERTIFICATION_SUPPRESSION_COLLECTION,
        subjectDid,
        subjectHandle: subjectHandle || undefined,
        hiddenAt,
        hiddenByDid: requester.did,
        hiddenByHandle: requester.handle,
      },
      validate: false,
    });

    return NextResponse.json({
      success: true,
      action: "hidden-on-kelo",
      subjectDid,
      subjectHandle,
      hiddenAt,
    });
  } catch (error) {
    console.error("[admin/certification-visibility]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erreur interne du serveur.",
      },
      { status: 500 }
    );
  }
}
