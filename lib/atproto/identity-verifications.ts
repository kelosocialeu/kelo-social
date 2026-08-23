import { AtpAgent } from "@atproto/api";

export const IDENTITY_VERIFICATION_COLLECTION = "eu.kelosocial.identityverification";
export const IDENTITY_VERIFICATION_REPO_HANDLE = "kelosocial.eu";
export const IDENTITY_VERIFICATION_PDS_URL =
  process.env.NEXT_PUBLIC_IDENTITY_VERIFICATION_PDS_URL || "https://eurosky.social";

export type IdentityVerificationType =
  | "human"
  | "enterprise"
  | "media"
  | "university"
  | "association"
  | "institution";

export type IdentityVerificationSource = "kelo-id" | "kelo-verify";
export type IdentityVerificationAssignmentMode = "automatic" | "manual";

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
const identityVerificationCache = new Map<string, IdentityVerificationCacheEntry>();
let allRecordsCache: IdentityVerificationRecord[] | null = null;
let allRecordsExpiresAt = 0;
let pendingAllRecords: Promise<IdentityVerificationRecord[]> | null = null;

function normalizeDid(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeHandle(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function isIdentityVerificationType(value: unknown): value is IdentityVerificationType {
  return ["human", "enterprise", "media", "university", "association", "institution"].includes(String(value));
}

function isIdentityVerificationSource(value: unknown): value is IdentityVerificationSource {
  return value === "kelo-id" || value === "kelo-verify";
}

function isIdentityVerificationAssignmentMode(value: unknown): value is IdentityVerificationAssignmentMode {
  return value === "automatic" || value === "manual";
}

function parseIdentityVerificationRecord(value: unknown): IdentityVerificationRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.subjectDid !== "string" ||
    typeof record.subjectHandle !== "string" ||
    !isIdentityVerificationType(record.verificationType) ||
    !isIdentityVerificationSource(record.source) ||
    !isIdentityVerificationAssignmentMode(record.assignmentMode) ||
    typeof record.issuedAt !== "string"
  ) return null;

  return {
    subjectDid: normalizeDid(record.subjectDid),
    subjectHandle: normalizeHandle(record.subjectHandle),
    verificationType: record.verificationType,
    source: record.source,
    assignmentMode: record.assignmentMode,
    issuedAt: record.issuedAt,
    issuerDid: typeof record.issuerDid === "string" ? normalizeDid(record.issuerDid) : undefined,
    issuerHandle: typeof record.issuerHandle === "string" ? normalizeHandle(record.issuerHandle) : undefined,
    schemaVersion: typeof record.schemaVersion === "number" ? record.schemaVersion : 1,
  };
}

function cacheRecords(records: IdentityVerificationRecord[]) {
  for (const record of records) {
    identityVerificationCache.set(normalizeDid(record.subjectDid), {
      value: record,
      expiresAt: Date.now() + CACHE_DURATION_MS,
    });
  }
  allRecordsCache = records;
  allRecordsExpiresAt = Date.now() + CACHE_DURATION_MS;
}

async function fetchAllIdentityVerificationsDirect(): Promise<IdentityVerificationRecord[]> {
  const agent = new AtpAgent({ service: IDENTITY_VERIFICATION_PDS_URL });
  const results: IdentityVerificationRecord[] = [];
  let cursor: string | undefined;

  do {
    const response = await agent.api.com.atproto.repo.listRecords({
      repo: IDENTITY_VERIFICATION_REPO_HANDLE,
      collection: IDENTITY_VERIFICATION_COLLECTION,
      limit: 100,
      cursor,
    });
    for (const item of response.data.records) {
      const parsed = parseIdentityVerificationRecord(item.value);
      if (parsed) results.push(parsed);
    }
    cursor = response.data.cursor;
  } while (cursor);

  cacheRecords(results);
  return results;
}

async function fetchAllIdentityVerifications(): Promise<IdentityVerificationRecord[]> {
  if (typeof window !== "undefined") {
    const response = await fetch("/api/kelo/identity-verifications", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Impossible de charger les vérifications d’identité.");
    }
    const records = Array.isArray(data?.records)
      ? data.records.map(parseIdentityVerificationRecord).filter(Boolean) as IdentityVerificationRecord[]
      : [];
    cacheRecords(records);
    return records;
  }

  return fetchAllIdentityVerificationsDirect();
}

export async function listIdentityVerifications(): Promise<IdentityVerificationRecord[]> {
  if (allRecordsCache && allRecordsExpiresAt > Date.now()) return allRecordsCache;
  if (pendingAllRecords) return pendingAllRecords;

  pendingAllRecords = fetchAllIdentityVerifications()
    .catch((error) => {
      if (allRecordsCache) return allRecordsCache;
      throw error;
    })
    .finally(() => {
      pendingAllRecords = null;
    });

  return pendingAllRecords;
}

export async function getIdentityVerification(subjectDid: string): Promise<IdentityVerificationRecord | null> {
  const normalizedDid = normalizeDid(subjectDid);
  if (!normalizedDid) return null;

  const cached = identityVerificationCache.get(normalizedDid);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const records = await listIdentityVerifications();
    const found = records.find((record) => normalizeDid(record.subjectDid) === normalizedDid) || null;
    identityVerificationCache.set(normalizedDid, {
      value: found,
      expiresAt: Date.now() + CACHE_DURATION_MS,
    });
    return found;
  } catch (error) {
    const stale = identityVerificationCache.get(normalizedDid);
    if (stale) return stale.value;
    throw error;
  }
}

export function findIdentityVerification(
  records: IdentityVerificationRecord[],
  subjectDid: string
): IdentityVerificationRecord | null {
  const normalizedDid = normalizeDid(subjectDid);
  return records.find((record) => normalizeDid(record.subjectDid) === normalizedDid) || null;
}

export const IDENTITY_VERIFICATION_LABELS: Record<IdentityVerificationType, string> = {
  human: "Humain vérifié",
  enterprise: "Entreprise vérifiée",
  media: "Média vérifié",
  university: "Université vérifiée",
  association: "Association vérifiée",
  institution: "Institution vérifiée",
};

export const IDENTITY_VERIFICATION_SOURCE_LABELS: Record<IdentityVerificationSource, string> = {
  "kelo-id": "Kelo ID",
  "kelo-verify": "Kelo Verify",
};

export function clearIdentityVerificationCache(subjectDid?: string): void {
  if (subjectDid) identityVerificationCache.delete(normalizeDid(subjectDid));
  else identityVerificationCache.clear();
  allRecordsCache = null;
  allRecordsExpiresAt = 0;
  pendingAllRecords = null;
}
