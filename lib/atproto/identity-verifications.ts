import { AtpAgent } from "@atproto/api";

export const IDENTITY_VERIFICATION_COLLECTION =
  "eu.kelosocial.identityverification";

export const IDENTITY_VERIFICATION_REPO_HANDLE =
  "kelosocial.eu";

export const IDENTITY_VERIFICATION_PDS_URL =
  process.env.NEXT_PUBLIC_IDENTITY_VERIFICATION_PDS_URL ||
  "https://eurosky.social";

export type IdentityVerificationType =
  | "human"
  | "enterprise"
  | "media"
  | "university"
  | "association"
  | "institution";

export type IdentityVerificationSource =
  | "kelo-id"
  | "kelo-verify";

export type IdentityVerificationAssignmentMode =
  | "automatic"
  | "manual";

export interface IdentityVerificationRecord {
  subjectDid: string;
  subjectHandle: string;
  verificationType: IdentityVerificationType;
  source: IdentityVerificationSource;
  assignmentMode: IdentityVerificationAssignmentMode;
  issuedAt: string;
  issuerDid?: string;
  issuerHandle?: string;
  schemaVersion?: number;
}

interface IdentityVerificationCacheEntry {
  value: IdentityVerificationRecord | null;
  expiresAt: number;
}

const CACHE_DURATION_MS = 5 * 60 * 1000;

const identityVerificationCache = new Map<
  string,
  IdentityVerificationCacheEntry
>();

function normalizeDid(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeHandle(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function isIdentityVerificationType(
  value: unknown
): value is IdentityVerificationType {
  return (
    value === "human" ||
    value === "enterprise" ||
    value === "media" ||
    value === "university" ||
    value === "association" ||
    value === "institution"
  );
}

function isIdentityVerificationSource(
  value: unknown
): value is IdentityVerificationSource {
  return value === "kelo-id" || value === "kelo-verify";
}

function isIdentityVerificationAssignmentMode(
  value: unknown
): value is IdentityVerificationAssignmentMode {
  return value === "automatic" || value === "manual";
}

function parseIdentityVerificationRecord(
  value: unknown
): IdentityVerificationRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.subjectDid !== "string" ||
    typeof record.subjectHandle !== "string" ||
    !isIdentityVerificationType(record.verificationType) ||
    !isIdentityVerificationSource(record.source) ||
    !isIdentityVerificationAssignmentMode(
      record.assignmentMode
    ) ||
    typeof record.issuedAt !== "string"
  ) {
    return null;
  }

  return {
    subjectDid: normalizeDid(record.subjectDid),
    subjectHandle: normalizeHandle(record.subjectHandle),
    verificationType: record.verificationType,
    source: record.source,
    assignmentMode: record.assignmentMode,
    issuedAt: record.issuedAt,
    issuerDid:
      typeof record.issuerDid === "string"
        ? normalizeDid(record.issuerDid)
        : undefined,
    issuerHandle:
      typeof record.issuerHandle === "string"
        ? normalizeHandle(record.issuerHandle)
        : undefined,
    schemaVersion:
      typeof record.schemaVersion === "number"
        ? record.schemaVersion
        : 1,
  };
}

function createIdentityVerificationAgent(): AtpAgent {
  return new AtpAgent({
    service: IDENTITY_VERIFICATION_PDS_URL,
  });
}

function isMissingRecordError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    status?: number;
    error?: string;
    message?: string;
  };

  const text = `${candidate.error || ""} ${candidate.message || ""}`.toLowerCase();

  return (
    candidate.status === 404 ||
    text.includes("recordnotfound") ||
    text.includes("record not found") ||
    text.includes("could not locate record")
  );
}

export async function listIdentityVerifications(): Promise<
  IdentityVerificationRecord[]
> {
  const agent = createIdentityVerificationAgent();
  const results: IdentityVerificationRecord[] = [];

  let cursor: string | undefined;

  do {
    const response =
      await agent.api.com.atproto.repo.listRecords({
        repo: IDENTITY_VERIFICATION_REPO_HANDLE,
        collection: IDENTITY_VERIFICATION_COLLECTION,
        limit: 100,
        cursor,
      });

    for (const item of response.data.records) {
      const parsed = parseIdentityVerificationRecord(
        item.value
      );

      if (!parsed) {
        continue;
      }

      results.push(parsed);

      identityVerificationCache.set(
        normalizeDid(parsed.subjectDid),
        {
          value: parsed,
          expiresAt: Date.now() + CACHE_DURATION_MS,
        }
      );
    }

    cursor = response.data.cursor;
  } while (cursor);

  return results;
}

export async function getIdentityVerification(
  subjectDid: string
): Promise<IdentityVerificationRecord | null> {
  const normalizedDid = normalizeDid(subjectDid);

  if (!normalizedDid) {
    return null;
  }

  const cached =
    identityVerificationCache.get(normalizedDid);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const agent = createIdentityVerificationAgent();

  try {
    const response =
      await agent.api.com.atproto.repo.getRecord({
        repo: IDENTITY_VERIFICATION_REPO_HANDLE,
        collection: IDENTITY_VERIFICATION_COLLECTION,
        rkey: normalizedDid,
      });

    const parsed = parseIdentityVerificationRecord(
      response.data.value
    );

    identityVerificationCache.set(normalizedDid, {
      value: parsed,
      expiresAt: Date.now() + CACHE_DURATION_MS,
    });

    return parsed;
  } catch (error) {
    // Une absence réelle peut être mémorisée. Une panne réseau, un timeout,
    // un 429 ou une erreur 5xx doit au contraire remonter jusqu'au hook afin
    // qu'il conserve le dernier statut de certification connu.
    if (isMissingRecordError(error)) {
      identityVerificationCache.set(normalizedDid, {
        value: null,
        expiresAt: Date.now() + CACHE_DURATION_MS,
      });
      return null;
    }

    throw error;
  }
}

export function findIdentityVerification(
  records: IdentityVerificationRecord[],
  subjectDid: string
): IdentityVerificationRecord | null {
  const normalizedDid = normalizeDid(subjectDid);

  return (
    records.find(
      (record) =>
        normalizeDid(record.subjectDid) === normalizedDid
    ) || null
  );
}

export const IDENTITY_VERIFICATION_LABELS: Record<
  IdentityVerificationType,
  string
> = {
  human: "Humain vérifié",
  enterprise: "Entreprise vérifiée",
  media: "Média vérifié",
  university: "Université vérifiée",
  association: "Association vérifiée",
  institution: "Institution vérifiée",
};

export const IDENTITY_VERIFICATION_SOURCE_LABELS: Record<
  IdentityVerificationSource,
  string
> = {
  "kelo-id": "Kelo ID",
  "kelo-verify": "Kelo Verify",
};

export function clearIdentityVerificationCache(
  subjectDid?: string
): void {
  if (subjectDid) {
    identityVerificationCache.delete(
      normalizeDid(subjectDid)
    );
    return;
  }

  identityVerificationCache.clear();
}
