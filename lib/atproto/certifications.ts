import { AtpAgent } from "@atproto/api";

/**
 * Collection AT Protocol personnalisée dans laquelle @kelosocial.eu publie
 * les certifications Kelo Social.
 */
export const CERTIFICATION_COLLECTION =
  "eu.kelosocial.certification";

export const ADMIN_REPO_HANDLE = "kelosocial.eu";

/**
 * Le dépôt @kelosocial.eu est hébergé sur EuroSky.
 * Cette URL peut être remplacée par une variable d’environnement publique.
 */
export const ADMIN_REPO_PDS_URL =
  process.env.NEXT_PUBLIC_ADMIN_REPO_PDS_URL ||
  "https://eurosky.social";

export type CertificationStatus =
  | "certified"
  | "trusted-verifier";

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

const CACHE_DURATION = 5 * 60 * 1000;
const certificationCache = new Map<
  string,
  CertificationCacheEntry
>();

function normalizeDid(value: string): string {
  return value.trim().toLowerCase();
}

function isCertificationStatus(
  value: unknown
): value is CertificationStatus {
  return (
    value === "certified" ||
    value === "trusted-verifier"
  );
}

function parseCertificationRecord(
  value: any
): CertificationRecord | null {
  if (
    !value ||
    typeof value.subjectDid !== "string" ||
    typeof value.subjectHandle !== "string" ||
    !isCertificationStatus(value.status) ||
    typeof value.issuedAt !== "string"
  ) {
    return null;
  }

  return {
    subjectDid: value.subjectDid,
    subjectHandle: value.subjectHandle,
    status: value.status,
    issuedAt: value.issuedAt,
    issuerDid:
      typeof value.issuerDid === "string"
        ? value.issuerDid
        : undefined,
    issuerHandle:
      typeof value.issuerHandle === "string"
        ? value.issuerHandle
        : undefined,
  };
}

function createAdminRepoAgent(): AtpAgent {
  return new AtpAgent({
    service: ADMIN_REPO_PDS_URL,
  });
}

/**
 * Récupère toutes les certifications publiées par @kelosocial.eu.
 * La pagination permet de dépasser la limite de 100 records.
 */
export async function listCertifications(): Promise<
  CertificationRecord[]
> {
  const agent = createAdminRepoAgent();
  const certifications: CertificationRecord[] = [];

  let cursor: string | undefined;

  do {
    const response =
      await agent.api.com.atproto.repo.listRecords({
        repo: ADMIN_REPO_HANDLE,
        collection: CERTIFICATION_COLLECTION,
        limit: 100,
        cursor,
      });

    for (const record of response.data.records) {
      const parsed = parseCertificationRecord(
        record.value
      );

      if (parsed) {
        certifications.push(parsed);

        certificationCache.set(
          normalizeDid(parsed.subjectDid),
          {
            value: parsed,
            expiresAt: Date.now() + CACHE_DURATION,
          }
        );
      }
    }

    cursor = response.data.cursor;
  } while (cursor);

  return certifications;
}

/**
 * Récupère la certification Kelo d’un compte à partir de son DID.
 *
 * Le DID est aussi utilisé comme rkey par la route d’administration.
 * Les résultats sont mis en cache pour éviter une requête réseau à chaque
 * apparition d’un badge dans le fil.
 */
export async function getKeloCertification(
  subjectDid: string
): Promise<CertificationRecord | null> {
  const normalizedDid = normalizeDid(subjectDid);

  if (!normalizedDid) {
    return null;
  }

  const cached =
    certificationCache.get(normalizedDid);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const agent = createAdminRepoAgent();

  try {
    const response =
      await agent.api.com.atproto.repo.getRecord({
        repo: ADMIN_REPO_HANDLE,
        collection: CERTIFICATION_COLLECTION,
        rkey: normalizedDid,
      });

    const parsed = parseCertificationRecord(
      response.data.value
    );

    certificationCache.set(normalizedDid, {
      value: parsed,
      expiresAt: Date.now() + CACHE_DURATION,
    });

    return parsed;
  } catch {
    certificationCache.set(normalizedDid, {
      value: null,
      expiresAt: Date.now() + CACHE_DURATION,
    });

    return null;
  }
}

/**
 * Vide le cache après une attribution ou une révocation depuis le panneau
 * d’administration.
 */
export function clearCertificationCache(
  subjectDid?: string
): void {
  if (subjectDid) {
    certificationCache.delete(
      normalizeDid(subjectDid)
    );
    return;
  }

  certificationCache.clear();
}
