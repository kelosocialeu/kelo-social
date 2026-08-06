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

function isValidStatus(
  value: unknown
): value is CertificationStatus {
  return (
    value === "certified" ||
    value === "trusted-verifier" ||
    value === "none"
  );
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

function parseStoredCertification(
  value: unknown
): StoredCertificationRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.subjectDid !== "string" ||
    typeof record.subjectHandle !== "string" ||
    (record.status !== "certified" &&
      record.status !== "trusted-verifier") ||
    typeof record.issuedAt !== "string"
  ) {
    return null;
  }

  return {
    subjectDid: record.subjectDid,
    subjectHandle: normalizeHandle(
      record.subjectHandle
    ),
    status: record.status,
    issuedAt: record.issuedAt,
    issuerDid:
      typeof record.issuerDid === "string" &&
      record.issuerDid.trim()
        ? normalizeDid(record.issuerDid)
        : undefined,
    issuerHandle:
      typeof record.issuerHandle === "string" &&
      record.issuerHandle.trim()
        ? normalizeHandle(record.issuerHandle)
        : undefined,
  };
}

function isMainAdmin(
  did: string,
  handle: string
): boolean {
  const normalizedDid = normalizeDid(did);
  const normalizedHandle = normalizeHandle(handle);

  return (
    getAdminDids().includes(normalizedDid) ||
    getAdminHandles().includes(normalizedHandle)
  );
}

async function authenticateRequester(
  session: RequestSession
) {
  const agent = new AtpAgent({
    service: session.pdsUrl,
  });

  await agent.resumeSession({
    accessJwt: session.accessJwt,
    refreshJwt: session.refreshJwt || "",
    active: true,
    handle: session.handle,
    did: session.did,
  });

  const response =
    await agent.api.com.atproto.server.getSession();

  return {
    agent,
    did: normalizeDid(response.data.did || ""),
    handle: normalizeHandle(
      response.data.handle || ""
    ),
  };
}

async function authenticateCertificationRepo() {
  if (!CERTIFICATION_REPO_APP_PASSWORD) {
    throw new Error(
      "Configuration serveur incomplète : CERTIFICATION_REPO_APP_PASSWORD est manquant."
    );
  }

  const agent = new AtpAgent({
    service: CERTIFICATION_REPO_PDS_URL,
  });

  await agent.login({
    identifier: CERTIFICATION_REPO_IDENTIFIER,
    password: CERTIFICATION_REPO_APP_PASSWORD,
  });

  if (!agent.session?.did) {
    throw new Error(
      "Impossible d’authentifier le dépôt central de certification."
    );
  }

  return {
    agent,
    repoDid: normalizeDid(agent.session.did),
    repoHandle: normalizeHandle(
      agent.session.handle ||
        CERTIFICATION_REPO_IDENTIFIER
    ),
  };
}

async function getCertificationRecord(
  agent: AtpAgent,
  repo: string,
  subjectDid: string
): Promise<StoredCertificationRecord | null> {
  try {
    const response =
      await agent.api.com.atproto.repo.getRecord({
        repo,
        collection: CERTIFICATION_COLLECTION,
        rkey: normalizeDid(subjectDid),
      });

    return parseStoredCertification(
      response.data.value
    );
  } catch {
    return null;
  }
}

async function requesterIsTrustedVerifier(
  agent: AtpAgent,
  repo: string,
  requesterDid: string
): Promise<boolean> {
  const record = await getCertificationRecord(
    agent,
    repo,
    requesterDid
  );

  return record?.status === "trusted-verifier";
}

function getEffectiveIssuerDid(
  record: StoredCertificationRecord,
  adminRepoDid: string
): string {
  return normalizeDid(
    record.issuerDid || adminRepoDid
  );
}

function getEffectiveIssuerHandle(
  record: StoredCertificationRecord,
  adminRepoHandle: string
): string {
  return normalizeHandle(
    record.issuerHandle || adminRepoHandle
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const session = body?.session;
    const rawTargetHandle =
      typeof body?.targetHandle === "string"
        ? body.targetHandle
        : "";

    const status = body?.status;

    if (!isValidSession(session)) {
      return NextResponse.json(
        {
          error:
            "Session invalide ou incomplète. Reconnectez-vous.",
        },
        { status: 401 }
      );
    }

    if (!rawTargetHandle.trim()) {
      return NextResponse.json(
        {
          error:
            "Handle du compte cible manquant.",
        },
        { status: 400 }
      );
    }

    if (!isValidStatus(status)) {
      return NextResponse.json(
        {
          error:
            "Statut de certification invalide.",
        },
        { status: 400 }
      );
    }

    const requester =
      await authenticateRequester(session);

    if (!requester.did || !requester.handle) {
      return NextResponse.json(
        {
          error:
            "Impossible de vérifier l’identité du compte connecté.",
        },
        { status: 401 }
      );
    }

    const certificationRepo =
      await authenticateCertificationRepo();

    const requesterIsAdmin = isMainAdmin(
      requester.did,
      requester.handle
    );

    const requesterHasFlower =
      await requesterIsTrustedVerifier(
        certificationRepo.agent,
        certificationRepo.repoDid,
        requester.did
      );

    if (
      !requesterIsAdmin &&
      !requesterHasFlower
    ) {
      return NextResponse.json(
        {
          error:
            "Accès refusé : vous n’êtes ni administrateur Kelo Social ni certificateur de confiance.",
        },
        { status: 403 }
      );
    }

    if (
      status === "trusted-verifier" &&
      !requesterIsAdmin
    ) {
      return NextResponse.json(
        {
          error:
            "Seul l’administrateur principal Kelo Social peut attribuer une fleur.",
        },
        { status: 403 }
      );
    }

    const targetHandle =
      normalizeHandle(rawTargetHandle);

    const resolved =
      await requester.agent.api.com.atproto.identity.resolveHandle(
        {
          handle: targetHandle,
        }
      );

    const subjectDid = normalizeDid(
      resolved.data.did || ""
    );

    if (!subjectDid) {
      return NextResponse.json(
        {
          error:
            "Impossible de trouver le DID du compte cible.",
        },
        { status: 404 }
      );
    }

    const recordKey = subjectDid;

    const existingRecord =
      await getCertificationRecord(
        certificationRepo.agent,
        certificationRepo.repoDid,
        subjectDid
      );

    if (status === "none") {
      if (!existingRecord) {
        return NextResponse.json({
          success: true,
          action: "already-revoked",
          subjectDid,
          subjectHandle: targetHandle,
        });
      }

      const existingIssuerDid =
        getEffectiveIssuerDid(
          existingRecord,
          certificationRepo.repoDid
        );

      if (!requesterIsAdmin) {
        if (
          existingRecord.status !== "certified"
        ) {
          return NextResponse.json(
            {
              error:
                "Un certificateur de confiance ne peut pas retirer une fleur.",
            },
            { status: 403 }
          );
        }

        if (
          existingIssuerDid !== requester.did
        ) {
          return NextResponse.json(
            {
              error:
                "Vous ne pouvez retirer que les certifications que vous avez vous-même attribuées.",
            },
            { status: 403 }
          );
        }
      }

      await certificationRepo.agent.api.com.atproto.repo.deleteRecord(
        {
          repo: certificationRepo.repoDid,
          collection:
            CERTIFICATION_COLLECTION,
          rkey: recordKey,
        }
      );

      return NextResponse.json({
        success: true,
        action: "revoked",
        subjectDid,
        subjectHandle:
          existingRecord.subjectHandle ||
          targetHandle,
        previousStatus:
          existingRecord.status,
        previousIssuerDid:
          existingIssuerDid,
        previousIssuerHandle:
          getEffectiveIssuerHandle(
            existingRecord,
            certificationRepo.repoHandle
          ),
      });
    }

    if (
      !requesterIsAdmin &&
      status !== "certified"
    ) {
      return NextResponse.json(
        {
          error:
            "Un certificateur de confiance peut uniquement attribuer une certification ronde.",
        },
        { status: 403 }
      );
    }

    if (existingRecord) {
      const existingIssuerDid =
        getEffectiveIssuerDid(
          existingRecord,
          certificationRepo.repoDid
        );

      if (!requesterIsAdmin) {
        if (
          existingRecord.status ===
          "trusted-verifier"
        ) {
          return NextResponse.json(
            {
              error:
                "Ce compte est déjà certificateur de confiance. Vous ne pouvez pas remplacer sa fleur.",
            },
            { status: 409 }
          );
        }

        if (
          existingIssuerDid !== requester.did
        ) {
          return NextResponse.json(
            {
              error:
                "Ce compte est déjà certifié par Kelo Social ou par un autre certificateur de confiance.",
            },
            { status: 409 }
          );
        }
      }
    }

    const issuedAt =
      existingRecord &&
      existingRecord.status === status &&
      getEffectiveIssuerDid(
        existingRecord,
        certificationRepo.repoDid
      ) === requester.did
        ? existingRecord.issuedAt
        : new Date().toISOString();

    const response =
      await certificationRepo.agent.api.com.atproto.repo.putRecord(
        {
          repo: certificationRepo.repoDid,
          collection:
            CERTIFICATION_COLLECTION,
          rkey: recordKey,
          record: {
            $type:
              CERTIFICATION_COLLECTION,
            subjectDid,
            subjectHandle: targetHandle,
            status,
            issuedAt,
            issuerDid: requester.did,
            issuerHandle:
              requester.handle,
          },
          validate: false,
        }
      );

    return NextResponse.json({
      success: true,
      action:
        existingRecord
          ? "updated"
          : "certified",
      uri: response.data.uri,
      cid: response.data.cid,
      subjectDid,
      subjectHandle: targetHandle,
      status,
      issuedAt,
      issuerDid: requester.did,
      issuerHandle:
        requester.handle,
    });
  } catch (error) {
    console.error(
      "[admin/certify] Erreur",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur interne du serveur.",
      },
      { status: 500 }
    );
  }
}
