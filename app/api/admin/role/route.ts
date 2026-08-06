import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

const CERTIFICATION_COLLECTION =
  "eu.kelosocial.certification";

const CERTIFICATION_REPO_IDENTIFIER =
  process.env.CERTIFICATION_REPO_IDENTIFIER?.trim() ||
  "kelosocial.eu";

const CERTIFICATION_REPO_PDS_URL =
  process.env.CERTIFICATION_REPO_PDS_URL?.trim() ||
  "https://eurosky.social";

interface RequestSession {
  accessJwt: string;
  refreshJwt?: string;
  pdsUrl: string;
  handle: string;
  did: string;
}

function normalizeHandle(value: string): string {
  return value
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function normalizeDid(value: string): string {
  return value.trim().toLowerCase();
}

function getAdminHandles(): string[] {
  return (process.env.ADMIN_HANDLES || "")
    .split(",")
    .map(normalizeHandle)
    .filter(Boolean);
}

function getAdminDids(): string[] {
  return (process.env.ADMIN_DIDS || "")
    .split(",")
    .map(normalizeDid)
    .filter(Boolean);
}

function isValidSession(
  value: unknown
): value is RequestSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<RequestSession>;

  return (
    typeof session.accessJwt === "string" &&
    !!session.accessJwt &&
    typeof session.pdsUrl === "string" &&
    !!session.pdsUrl &&
    typeof session.handle === "string" &&
    !!session.handle &&
    typeof session.did === "string" &&
    !!session.did
  );
}

function isMainAdmin(
  did: string,
  handle: string
): boolean {
  return (
    getAdminDids().includes(normalizeDid(did)) ||
    getAdminHandles().includes(
      normalizeHandle(handle)
    )
  );
}

async function isTrustedVerifier(
  did: string
): Promise<boolean> {
  const agent = new AtpAgent({
    service: CERTIFICATION_REPO_PDS_URL,
  });

  try {
    const response =
      await agent.api.com.atproto.repo.getRecord({
        repo: CERTIFICATION_REPO_IDENTIFIER,
        collection: CERTIFICATION_COLLECTION,
        rkey: normalizeDid(did),
      });

    const value = response.data.value as
      | Record<string, unknown>
      | undefined;

    return (
      value?.status === "trusted-verifier"
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!isValidSession(body)) {
      return NextResponse.json(
        {
          error:
            "Session invalide ou incomplète.",
          checked: true,
          isAdmin: false,
          isTrustedVerifier: false,
        },
        { status: 401 }
      );
    }

    const agent = new AtpAgent({
      service: body.pdsUrl,
    });

    await agent.resumeSession({
      accessJwt: body.accessJwt,
      refreshJwt: body.refreshJwt || "",
      active: true,
      handle: body.handle,
      did: body.did,
    });

    const sessionResponse =
      await agent.api.com.atproto.server.getSession();

    const verifiedDid = normalizeDid(
      sessionResponse.data.did || ""
    );

    const verifiedHandle = normalizeHandle(
      sessionResponse.data.handle || ""
    );

    if (!verifiedDid || !verifiedHandle) {
      return NextResponse.json(
        {
          error:
            "Impossible de vérifier le compte connecté.",
          checked: true,
          isAdmin: false,
          isTrustedVerifier: false,
        },
        { status: 401 }
      );
    }

    const admin = isMainAdmin(
      verifiedDid,
      verifiedHandle
    );

    const trustedVerifier = admin
      ? false
      : await isTrustedVerifier(verifiedDid);

    return NextResponse.json({
      checked: true,
      did: verifiedDid,
      handle: verifiedHandle,
      isAdmin: admin,
      isTrustedVerifier: trustedVerifier,

      canCertify:
        admin || trustedVerifier,

      canManageTrustedVerifiers:
        admin,

      canManageIdentity:
        admin,

      canViewGlobalCertificationHistory:
        admin,
    });
  } catch (error) {
    console.error(
      "[admin/role] Erreur :",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur interne du serveur.",
        checked: true,
        isAdmin: false,
        isTrustedVerifier: false,
      },
      { status: 500 }
    );
  }
}
