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

const CERTIFICATION_REPO_APP_PASSWORD =
  process.env.CERTIFICATION_REPO_APP_PASSWORD?.trim() ||
  "";

type CertificationStatus =
  | "certified"
  | "trusted-verifier"
  | "none";

interface StoredCertificationRecord {
  subjectDid: string;
  subjectHandle: string;
  status: Exclude<CertificationStatus, "none">;
  issuedAt: string;
  issuerDid?: string;
  issuerHandle?: string;
}

interface RequestSession {
  accessJwt: string;
  refreshJwt?: string;
  pdsUrl: string;
  handle: string;
  did: string;
}

function normalizeHandle(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
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

function isValidStatus(value: unknown): value is CertificationStatus {
  return (
    value === "certified" ||
    value === "trusted-verifier" ||
    value === "none"
  );
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

function parseStoredCertification(value: unknown): StoredCertificationRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  if (
    typeof record.subjectDid !== "string" ||
    typeof record.subjectHandle !== "string" ||
    (record.status !== "certified" && record.status !== "trusted-verifier") ||
    typeof record.issuedAt !== "string"
  ) {
    return null;
  }

  return {
    subjectDid: record.subjectDid,
    subjectHandle: normalizeHandle(record.subjectHandle),
    status: record.status,
    issuedAt: record.issuedAt,
    issuerDid:
      typeof record.issuerDid === "string" && record.issuerDid.trim()
        ? normalizeDid(record.issuerDid)
        : undefined,
    issuerHandle:
      typeof record.issuerHandle === "string" && record.issuerHandle.trim()
        ? normalizeHandle(record.issuerHandle)
        : undefined,
  };
}

function isMainAdmin(did: string, handle: string): boolean {
  return (
    getAdminDids().includes(normalizeDid(did)) ||
    getAdminHandles().includes(normalizeHandle(handle))
  );
}

function roundRecordKey(subjectDid: string, issuerDid: string): string {
  return `${normalizeDid(subjectDid)}~${normalizeDid(issuerDid)}`;
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
    agent,
    did: normalizeDid(response.data.did || ""),
    handle: normalizeHandle(response.data.handle || ""),
  };
}

async function authenticateCertificationRepo() {
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
    throw new Error("Impossible d’authentifier le dépôt central de certification.");
  }

  return {
    agent,
    repoDid: normalizeDid(agent.session.did),
    repoHandle: normalizeHandle(
      agent.session.handle || CERTIFICATION_REPO_IDENTIFIER
    ),
  };
}

async function getRecordByKey(
  agent: AtpAgent,
  repo: string,
  rkey: string
): Promise<StoredCertificationRecord | null> {
  try {
    const response = await agent.api.com.atproto.repo.getRecord({
      repo,
      collection: CERTIFICATION_COLLECTION,
      rkey,
    });
    return parseStoredCertification(response.data.value);
  } catch {
    return null;
  }
}

async function requesterIsTrustedVerifier(
  agent: AtpAgent,
  repo: string,
  requesterDid: string
): Promise<boolean> {
  // Les fleurs restent sur la clé historique = DID du compte.
  const record = await getRecordByKey(
    agent,
    repo,
    normalizeDid(requesterDid)
  );
  return record?.status === "trusted-verifier";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = body?.session;
    const rawTargetHandle =
      typeof body?.targetHandle === "string" ? body.targetHandle : "";
    const status = body?.status;

    if (!isValidSession(session)) {
      return NextResponse.json(
        { error: "Session invalide ou incomplète. Reconnectez-vous." },
        { status: 401 }
      );
    }
    if (!rawTargetHandle.trim()) {
      return NextResponse.json(
        { error: "Handle du compte cible manquant." },
        { status: 400 }
      );
    }
    if (!isValidStatus(status)) {
      return NextResponse.json(
        { error: "Statut de certification invalide." },
        { status: 400 }
      );
    }

    const requester = await authenticateRequester(session);
    if (!requester.did || !requester.handle) {
      return NextResponse.json(
        { error: "Impossible de vérifier l’identité du compte connecté." },
        { status: 401 }
      );
    }

    const certificationRepo = await authenticateCertificationRepo();
    const requesterIsAdmin = isMainAdmin(requester.did, requester.handle);
    const requesterHasFlower = await requesterIsTrustedVerifier(
      certificationRepo.agent,
      certificationRepo.repoDid,
      requester.did
    );

    if (!requesterIsAdmin && !requesterHasFlower) {
      return NextResponse.json(
        {
          error:
            "Accès refusé : vous n’êtes ni administrateur Kelo Social ni certificateur de confiance.",
        },
        { status: 403 }
      );
    }

    if (status === "trusted-verifier" && !requesterIsAdmin) {
      return NextResponse.json(
        { error: "Seul l’administrateur principal Kelo Social peut attribuer une fleur." },
        { status: 403 }
      );
    }

    const targetHandle = normalizeHandle(rawTargetHandle);
    const resolved = await requester.agent.api.com.atproto.identity.resolveHandle({
      handle: targetHandle,
    });
    const subjectDid = normalizeDid(resolved.data.did || "");

    if (!subjectDid) {
      return NextResponse.json(
        { error: "Impossible de trouver le DID du compte cible." },
        { status: 404 }
      );
    }

    // Une fleur reste un record unique par compte. Une certification ronde est
    // unique par paire (compte certifié, certificateur), ce qui permet aux
    // certificateurs de confiance de s'accumuler sans s'écraser.
    const recordKey =
      status === "trusted-verifier"
        ? subjectDid
        : roundRecordKey(subjectDid, requester.did);

    const existingOwnRecord = await getRecordByKey(
      certificationRepo.agent,
      certificationRepo.repoDid,
      recordKey
    );

    if (status === "none") {
      // Pour une révocation, on retire d'abord la certification ronde propre
      // au demandeur. Compatibilité : si elle n'existe pas, on essaie ensuite
      // l'ancienne clé historique, utilisée avant le multi-certificateur.
      const ownRoundKey = roundRecordKey(subjectDid, requester.did);
      const ownRound = await getRecordByKey(
        certificationRepo.agent,
        certificationRepo.repoDid,
        ownRoundKey
      );

      let keyToDelete = ownRound ? ownRoundKey : subjectDid;
      let recordToDelete = ownRound;

      if (!recordToDelete) {
        const legacy = await getRecordByKey(
          certificationRepo.agent,
          certificationRepo.repoDid,
          subjectDid
        );

        if (
          legacy &&
          legacy.status === "certified" &&
          normalizeDid(legacy.issuerDid || certificationRepo.repoDid) === requester.did
        ) {
          recordToDelete = legacy;
        } else if (requesterIsAdmin && legacy) {
          recordToDelete = legacy;
        }
      }

      if (!recordToDelete) {
        return NextResponse.json({
          success: true,
          action: "already-revoked",
          subjectDid,
          subjectHandle: targetHandle,
        });
      }

      if (!requesterIsAdmin && recordToDelete.status === "trusted-verifier") {
        return NextResponse.json(
          { error: "Un certificateur de confiance ne peut pas retirer une fleur." },
          { status: 403 }
        );
      }

      await certificationRepo.agent.api.com.atproto.repo.deleteRecord({
        repo: certificationRepo.repoDid,
        collection: CERTIFICATION_COLLECTION,
        rkey: keyToDelete,
      });

      return NextResponse.json({
        success: true,
        action: "revoked",
        subjectDid,
        subjectHandle: recordToDelete.subjectHandle || targetHandle,
        previousStatus: recordToDelete.status,
      });
    }

    if (!requesterIsAdmin && status !== "certified") {
      return NextResponse.json(
        { error: "Un certificateur de confiance peut uniquement attribuer une certification ronde." },
        { status: 403 }
      );
    }

    const issuedAt = existingOwnRecord?.issuedAt || new Date().toISOString();

    const response = await certificationRepo.agent.api.com.atproto.repo.putRecord({
      repo: certificationRepo.repoDid,
      collection: CERTIFICATION_COLLECTION,
      rkey: recordKey,
      record: {
        $type: CERTIFICATION_COLLECTION,
        subjectDid,
        subjectHandle: targetHandle,
        status,
        issuedAt,
        issuerDid: requester.did,
        issuerHandle: requester.handle,
      },
      validate: false,
    });

    return NextResponse.json({
      success: true,
      action: existingOwnRecord ? "updated" : "certified",
      uri: response.data.uri,
      cid: response.data.cid,
      subjectDid,
      subjectHandle: targetHandle,
      status,
      issuedAt,
      issuerDid: requester.did,
      issuerHandle: requester.handle,
    });
  } catch (error) {
    console.error("[admin/certify] Erreur", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erreur interne du serveur.",
      },
      { status: 500 }
    );
  }
}
