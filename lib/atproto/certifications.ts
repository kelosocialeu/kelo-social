import { AtpAgent } from "@atproto/api";

export const CERTIFICATION_COLLECTION = "eu.kelosocial.certification";
export const ADMIN_REPO_HANDLE = "kelosocial.eu";
export const KELO_ADMIN_DID = process.env.NEXT_PUBLIC_KELO_ADMIN_DID?.trim() || "";
export const KELO_ADMIN_HANDLE = "kelosocial.eu";
export const ADMIN_REPO_PDS_URL =
  process.env.NEXT_PUBLIC_ADMIN_REPO_PDS_URL?.trim() || "https://eurosky.social";

export type CertificationStatus = "certified" | "trusted-verifier";

export interface CertificationRecord {
  subjectDid: string;
  subjectHandle: string;
  status: CertificationStatus;
  issuedAt: string;
  issuerDid?: string;
  issuerHandle?: string;
}

interface CertificationCacheEntry {
  value: CertificationRecord | null;
  expiresAt: number;
}

// Les badges changent depuis le panneau admin pendant que d'autres pages sont
// déjà ouvertes. Un cache long donnait l'impression que Kelo ignorait les
// nouvelles certifications alors que le record AT Protocol existait bien.
const CACHE_DURATION = 20 * 1000;
const certificationCache = new Map<string, CertificationCacheEntry>();
let allRecordsCache: CertificationRecord[] | null = null;
let allRecordsExpiresAt = 0;
let pendingAllRecords: Promise<CertificationRecord[]> | null = null;

function normalizeDid(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeHandle(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function isCertificationStatus(value: unknown): value is CertificationStatus {
  return value === "certified" || value === "trusted-verifier";
}

function parseCertificationRecord(value: unknown): CertificationRecord | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (
    typeof record.subjectDid !== "string" ||
    typeof record.subjectHandle !== "string" ||
    !isCertificationStatus(record.status) ||
    typeof record.issuedAt !== "string"
  ) {
    return null;
  }

  return {
    subjectDid: record.subjectDid.trim(),
    subjectHandle: normalizeHandle(record.subjectHandle),
    status: record.status,
    issuedAt: record.issuedAt,
    issuerDid:
      typeof record.issuerDid === "string" && record.issuerDid.trim()
        ? record.issuerDid.trim()
        : KELO_ADMIN_DID || undefined,
    issuerHandle:
      typeof record.issuerHandle === "string" && record.issuerHandle.trim()
        ? normalizeHandle(record.issuerHandle)
        : KELO_ADMIN_HANDLE,
  };
}

function cacheRecords(records: CertificationRecord[]) {
  const now = Date.now();

  // On reconstruit le cache ciblé à partir du snapshot frais. Cela évite de
  // conserver un ancien statut lorsqu'une certification vient d'être modifiée.
  certificationCache.clear();

  for (const record of records) {
    const key = normalizeDid(record.subjectDid);
    const current = certificationCache.get(key)?.value;
    if (!current || record.status === "trusted-verifier") {
      certificationCache.set(key, {
        value: record,
        expiresAt: now + CACHE_DURATION,
      });
    }
  }

  allRecordsCache = records;
  allRecordsExpiresAt = now + CACHE_DURATION;
}

async function fetchAllRecordsDirect(): Promise<CertificationRecord[]> {
  const agent = new AtpAgent({ service: ADMIN_REPO_PDS_URL });
  const records: CertificationRecord[] = [];
  let cursor: string | undefined;

  do {
    const response = await agent.api.com.atproto.repo.listRecords({
      repo: ADMIN_REPO_HANDLE,
      collection: CERTIFICATION_COLLECTION,
      limit: 100,
      cursor,
    });
    for (const item of response.data.records) {
      const parsed = parseCertificationRecord(item.value);
      if (parsed) records.push(parsed);
    }
    cursor = response.data.cursor;
  } while (cursor);

  cacheRecords(records);
  return records;
}

async function fetchAllRecords(): Promise<CertificationRecord[]> {
  if (typeof window !== "undefined") {
    const response = await fetch(`/api/kelo/certifications?ts=${Date.now()}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, max-age=0",
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Impossible de charger les certifications Kelo Social.");
    }
    const records = Array.isArray(data?.records)
      ? data.records.map(parseCertificationRecord).filter(Boolean) as CertificationRecord[]
      : [];
    cacheRecords(records);
    return records;
  }

  return fetchAllRecordsDirect();
}

export async function listCertifications(): Promise<CertificationRecord[]> {
  const isAdminView =
    typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

  if (isAdminView) {
    pendingAllRecords = null;
    return fetchAllRecords();
  }

  if (allRecordsCache && allRecordsExpiresAt > Date.now()) return allRecordsCache;
  if (pendingAllRecords) return pendingAllRecords;

  pendingAllRecords = fetchAllRecords()
    .catch((error) => {
      if (allRecordsCache) return allRecordsCache;
      throw error;
    })
    .finally(() => {
      pendingAllRecords = null;
    });

  return pendingAllRecords;
}

export async function listTrustedVerifiers(): Promise<CertificationRecord[]> {
  return (await listCertifications()).filter((record) => record.status === "trusted-verifier");
}

export async function listCertifiedAccounts(): Promise<CertificationRecord[]> {
  return (await listCertifications()).filter((record) => record.status === "certified");
}

export async function listCertificationsByIssuer(issuerDid: string): Promise<CertificationRecord[]> {
  const normalizedIssuerDid = normalizeDid(issuerDid);
  if (!normalizedIssuerDid) return [];
  return (await listCertifications()).filter(
    (record) => !!record.issuerDid && normalizeDid(record.issuerDid) === normalizedIssuerDid
  );
}

export async function getKeloCertification(subjectDid: string): Promise<CertificationRecord | null> {
  const normalizedDid = normalizeDid(subjectDid);
  if (!normalizedDid) return null;

  const cached = certificationCache.get(normalizedDid);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const records = await listCertifications();
    let match: CertificationRecord | null = null;
    for (const record of records) {
      if (normalizeDid(record.subjectDid) !== normalizedDid) continue;
      if (!match || record.status === "trusted-verifier") match = record;
      if (match.status === "trusted-verifier") break;
    }
    certificationCache.set(normalizedDid, {
      value: match,
      expiresAt: Date.now() + CACHE_DURATION,
    });
    return match;
  } catch (error) {
    console.warn("Impossible de lire les certifications Kelo :", error);
    const stale = certificationCache.get(normalizedDid);
    if (stale) return stale.value;
    return null;
  }
}

export async function isTrustedVerifier(subjectDid: string): Promise<boolean> {
  return (await getKeloCertification(subjectDid))?.status === "trusted-verifier";
}

export function canRevokeCertification(
  certification: CertificationRecord | null,
  requesterDid: string
): boolean {
  if (!certification) return false;
  const normalizedRequesterDid = normalizeDid(requesterDid);
  if (!normalizedRequesterDid) return false;
  if (KELO_ADMIN_DID && normalizedRequesterDid === normalizeDid(KELO_ADMIN_DID)) return true;
  return !!certification.issuerDid && normalizedRequesterDid === normalizeDid(certification.issuerDid);
}

export function canManageTrustedVerifiers(requesterDid: string): boolean {
  return !!KELO_ADMIN_DID && normalizeDid(requesterDid) === normalizeDid(KELO_ADMIN_DID);
}

export function clearCertificationCache(subjectDid?: string): void {
  if (subjectDid) certificationCache.delete(normalizeDid(subjectDid));
  else certificationCache.clear();
  allRecordsCache = null;
  allRecordsExpiresAt = 0;
  pendingAllRecords = null;
}
