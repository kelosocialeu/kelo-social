import { AtpAgent } from "@atproto/api";

/** Collection AT Protocol personnalisée dans laquelle @kelosocial.eu publie les certifications Kelo Social. */
export const CERTIFICATION_COLLECTION = "eu.kelosocial.certification";

/** Handle du dépôt principal qui publie les certifications Kelo. */
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

const CACHE_DURATION = 2 * 60 * 1000;
const certificationCache = new Map<string, CertificationCacheEntry>();

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

  const issuerDid =
    typeof record.issuerDid === "string" && record.issuerDid.trim()
      ? record.issuerDid.trim()
      : KELO_ADMIN_DID || undefined;

  const issuerHandle =
    typeof record.issuerHandle === "string" && record.issuerHandle.trim()
      ? normalizeHandle(record.issuerHandle)
      : KELO_ADMIN_HANDLE;

  return {
    subjectDid: record.subjectDid.trim(),
    subjectHandle: normalizeHandle(record.subjectHandle),
    status: record.status,
    issuedAt: record.issuedAt,
    issuerDid,
    issuerHandle,
  };
}

function createAdminRepoAgent(): AtpAgent {
  return new AtpAgent({ service: ADMIN_REPO_PDS_URL });
}

/** Récupère toutes les certifications publiées par @kelosocial.eu. */
export async function listCertifications(): Promise<CertificationRecord[]> {
  const agent = createAdminRepoAgent();
  const certifications: CertificationRecord[] = [];
  let cursor: string | undefined;

  do {
    const response = await agent.api.com.atproto.repo.listRecords({
      repo: ADMIN_REPO_HANDLE,
      collection: CERTIFICATION_COLLECTION,
      limit: 100,
      cursor,
    });

    for (const record of response.data.records) {
      const parsed = parseCertificationRecord(record.value);
      if (!parsed) continue;

      certifications.push(parsed);
      const key = normalizeDid(parsed.subjectDid);
      const current = certificationCache.get(key)?.value;

      // Une fleur a toujours priorité sur un badge rond dans le cache ciblé.
      if (!current || parsed.status === "trusted-verifier") {
        certificationCache.set(key, {
          value: parsed,
          expiresAt: Date.now() + CACHE_DURATION,
        });
      }
    }

    cursor = response.data.cursor;
  } while (cursor);

  return certifications;
}

export async function listTrustedVerifiers(): Promise<CertificationRecord[]> {
  return (await listCertifications()).filter(
    (record) => record.status === "trusted-verifier"
  );
}

export async function listCertifiedAccounts(): Promise<CertificationRecord[]> {
  return (await listCertifications()).filter((record) => record.status === "certified");
}

export async function listCertificationsByIssuer(
  issuerDid: string
): Promise<CertificationRecord[]> {
  const normalizedIssuerDid = normalizeDid(issuerDid);
  if (!normalizedIssuerDid) return [];

  return (await listCertifications()).filter(
    (record) =>
      !!record.issuerDid && normalizeDid(record.issuerDid) === normalizedIssuerDid
  );
}

/**
 * Récupère la certification Kelo d’un compte.
 *
 * Les anciennes fleurs/certifications utilisaient directement le DID comme rkey.
 * Les certifications rondes récentes utilisent désormais `subjectDid~issuerDid`,
 * afin que plusieurs certificateurs puissent certifier le même compte.
 *
 * L’ancienne implémentation ne cherchait que `rkey = subjectDid`. Conséquence :
 * les nouvelles certifications rondes pouvaient rester invisibles jusqu’à ce
 * qu’un autre écran ait rechargé la collection complète. Ici on tente d’abord
 * le record direct, puis on parcourt la collection publique et on cherche le
 * sujet par DID. L’affichage ne dépend donc plus d’une visite du panneau admin.
 */
export async function getKeloCertification(
  subjectDid: string
): Promise<CertificationRecord | null> {
  const normalizedDid = normalizeDid(subjectDid);
  if (!normalizedDid) return null;

  const cached = certificationCache.get(normalizedDid);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const agent = createAdminRepoAgent();

  // 1) Compatibilité avec les anciennes certifications et les fleurs.
  try {
    const response = await agent.api.com.atproto.repo.getRecord({
      repo: ADMIN_REPO_HANDLE,
      collection: CERTIFICATION_COLLECTION,
      rkey: normalizedDid,
    });

    const parsed = parseCertificationRecord(response.data.value);
    if (parsed && normalizeDid(parsed.subjectDid) === normalizedDid) {
      certificationCache.set(normalizedDid, {
        value: parsed,
        expiresAt: Date.now() + CACHE_DURATION,
      });
      return parsed;
    }
  } catch {
    // Le record direct peut ne pas exister pour une certification ronde récente.
  }

  // 2) Les certifications rondes modernes ont un rkey composé du sujet + émetteur.
  // On lit donc la collection publique directement depuis le PDS central.
  try {
    let cursor: string | undefined;
    let match: CertificationRecord | null = null;

    do {
      const response = await agent.api.com.atproto.repo.listRecords({
        repo: ADMIN_REPO_HANDLE,
        collection: CERTIFICATION_COLLECTION,
        limit: 100,
        cursor,
      });

      for (const item of response.data.records) {
        const parsed = parseCertificationRecord(item.value);
        if (!parsed || normalizeDid(parsed.subjectDid) !== normalizedDid) continue;

        // Une fleur l’emporte sur un badge rond si les deux existent.
        if (!match || parsed.status === "trusted-verifier") {
          match = parsed;
        }

        if (match.status === "trusted-verifier") break;
      }

      if (match?.status === "trusted-verifier") break;
      cursor = response.data.cursor;
    } while (cursor);

    certificationCache.set(normalizedDid, {
      value: match,
      expiresAt: Date.now() + CACHE_DURATION,
    });

    return match;
  } catch (error) {
    console.warn("Impossible de lire les certifications Kelo directement :", error);

    // Ne gardons un résultat négatif que brièvement : une panne réseau ne doit
    // pas faire disparaître un badge pendant plusieurs minutes.
    certificationCache.set(normalizedDid, {
      value: null,
      expiresAt: Date.now() + 15 * 1000,
    });
    return null;
  }
}

export async function isTrustedVerifier(subjectDid: string): Promise<boolean> {
  const certification = await getKeloCertification(subjectDid);
  return certification?.status === "trusted-verifier";
}

export function canRevokeCertification(
  certification: CertificationRecord | null,
  requesterDid: string
): boolean {
  if (!certification) return false;

  const normalizedRequesterDid = normalizeDid(requesterDid);
  if (!normalizedRequesterDid) return false;

  if (
    KELO_ADMIN_DID &&
    normalizedRequesterDid === normalizeDid(KELO_ADMIN_DID)
  ) {
    return true;
  }

  if (!certification.issuerDid) return false;
  return normalizedRequesterDid === normalizeDid(certification.issuerDid);
}

export function canManageTrustedVerifiers(requesterDid: string): boolean {
  if (!KELO_ADMIN_DID) return false;
  return normalizeDid(requesterDid) === normalizeDid(KELO_ADMIN_DID);
}

export function clearCertificationCache(subjectDid?: string): void {
  if (subjectDid) {
    certificationCache.delete(normalizeDid(subjectDid));
    return;
  }
  certificationCache.clear();
}
