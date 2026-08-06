import { AtpAgent } from "@atproto/api";

/**
 * Collection AT Protocol personnalisée dans laquelle @kelosocial.eu publie
 * les certifications Kelo Social.
 */
export const CERTIFICATION_COLLECTION =
  "eu.kelosocial.certification";

/**
 * Handle du dépôt principal qui publie les certifications Kelo.
 */
export const ADMIN_REPO_HANDLE =
  "kelosocial.eu";

/**
 * DID du compte administrateur principal Kelo Social.
 *
 * Il doit être ajouté dans les variables d’environnement de Vercel :
 *
 * NEXT_PUBLIC_KELO_ADMIN_DID=did:plc:...
 */
export const KELO_ADMIN_DID =
  process.env.NEXT_PUBLIC_KELO_ADMIN_DID?.trim() ||
  "";

/**
 * Handle affiché comme émetteur pour les anciennes certifications
 * qui ne possèdent pas encore issuerDid ou issuerHandle.
 */
export const KELO_ADMIN_HANDLE =
  "kelosocial.eu";

/**
 * Le dépôt @kelosocial.eu est hébergé sur EuroSky.
 *
 * Cette URL peut être remplacée avec :
 *
 * NEXT_PUBLIC_ADMIN_REPO_PDS_URL=https://eurosky.social
 */
export const ADMIN_REPO_PDS_URL =
  process.env
    .NEXT_PUBLIC_ADMIN_REPO_PDS_URL
    ?.trim() ||
  "https://eurosky.social";

export type CertificationStatus =
  | "certified"
  | "trusted-verifier";

export interface CertificationRecord {
  /**
   * Compte qui reçoit le badge rond ou la fleur.
   */
  subjectDid: string;
  subjectHandle: string;

  /**
   * certified = badge rond
   * trusted-verifier = badge fleur
   */
  status: CertificationStatus;

  /**
   * Date d’attribution initiale.
   */
  issuedAt: string;

  /**
   * Compte ayant attribué la certification.
   *
   * Pour les anciens records sans émetteur, Kelo Social
   * est utilisé comme émetteur par défaut.
   */
  issuerDid?: string;
  issuerHandle?: string;
}

interface CertificationCacheEntry {
  value: CertificationRecord | null;
  expiresAt: number;
}

const CACHE_DURATION =
  5 * 60 * 1000;

const certificationCache = new Map<
  string,
  CertificationCacheEntry
>();

function normalizeDid(
  value: string
): string {
  return value
    .trim()
    .toLowerCase();
}

function normalizeHandle(
  value: string
): string {
  return value
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function isCertificationStatus(
  value: unknown
): value is CertificationStatus {
  return (
    value === "certified" ||
    value === "trusted-verifier"
  );
}

/**
 * Convertit un record AT Protocol en CertificationRecord.
 *
 * Compatibilité avec les anciennes certifications :
 *
 * - si issuerDid est absent, le record est considéré comme
 *   attribué par Kelo Social ;
 * - si issuerHandle est absent, kelosocial.eu est utilisé.
 *
 * Aucun ancien record n’est supprimé ou modifié.
 */
function parseCertificationRecord(
  value: unknown
): CertificationRecord | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const record = value as Record<
    string,
    unknown
  >;

  if (
    typeof record.subjectDid !==
      "string" ||
    typeof record.subjectHandle !==
      "string" ||
    !isCertificationStatus(
      record.status
    ) ||
    typeof record.issuedAt !==
      "string"
  ) {
    return null;
  }

  const issuerDid =
    typeof record.issuerDid ===
      "string" &&
    record.issuerDid.trim()
      ? record.issuerDid.trim()
      : KELO_ADMIN_DID || undefined;

  const issuerHandle =
    typeof record.issuerHandle ===
      "string" &&
    record.issuerHandle.trim()
      ? normalizeHandle(
          record.issuerHandle
        )
      : KELO_ADMIN_HANDLE;

  return {
    subjectDid:
      record.subjectDid.trim(),

    subjectHandle:
      normalizeHandle(
        record.subjectHandle
      ),

    status: record.status,

    issuedAt:
      record.issuedAt,

    issuerDid,

    issuerHandle,
  };
}

function createAdminRepoAgent(): AtpAgent {
  return new AtpAgent({
    service:
      ADMIN_REPO_PDS_URL,
  });
}

/**
 * Récupère toutes les certifications publiées par @kelosocial.eu.
 *
 * La pagination permet de dépasser la limite de 100 records.
 */
export async function listCertifications(): Promise<
  CertificationRecord[]
> {
  const agent =
    createAdminRepoAgent();

  const certifications:
    CertificationRecord[] = [];

  let cursor:
    | string
    | undefined;

  do {
    const response =
      await agent.api.com.atproto.repo.listRecords(
        {
          repo:
            ADMIN_REPO_HANDLE,

          collection:
            CERTIFICATION_COLLECTION,

          limit: 100,
          cursor,
        }
      );

    for (
      const record of
      response.data.records
    ) {
      const parsed =
        parseCertificationRecord(
          record.value
        );

      if (!parsed) {
        continue;
      }

      certifications.push(parsed);

      certificationCache.set(
        normalizeDid(
          parsed.subjectDid
        ),
        {
          value: parsed,
          expiresAt:
            Date.now() +
            CACHE_DURATION,
        }
      );
    }

    cursor =
      response.data.cursor;
  } while (cursor);

  return certifications;
}

/**
 * Récupère uniquement les comptes possédant une fleur.
 */
export async function listTrustedVerifiers(): Promise<
  CertificationRecord[]
> {
  const certifications =
    await listCertifications();

  return certifications.filter(
    (record) =>
      record.status ===
      "trusted-verifier"
  );
}

/**
 * Récupère uniquement les certifications rondes.
 */
export async function listCertifiedAccounts(): Promise<
  CertificationRecord[]
> {
  const certifications =
    await listCertifications();

  return certifications.filter(
    (record) =>
      record.status ===
      "certified"
  );
}

/**
 * Récupère toutes les certifications attribuées
 * par un émetteur précis.
 *
 * Cela permettra au panneau d’un certificateur de confiance
 * d’afficher uniquement ses propres certifications.
 */
export async function listCertificationsByIssuer(
  issuerDid: string
): Promise<CertificationRecord[]> {
  const normalizedIssuerDid =
    normalizeDid(issuerDid);

  if (!normalizedIssuerDid) {
    return [];
  }

  const certifications =
    await listCertifications();

  return certifications.filter(
    (record) =>
      !!record.issuerDid &&
      normalizeDid(
        record.issuerDid
      ) === normalizedIssuerDid
  );
}

/**
 * Récupère la certification Kelo d’un compte à partir de son DID.
 *
 * Le DID est également utilisé comme rkey par la route
 * d’administration actuelle.
 */
export async function getKeloCertification(
  subjectDid: string
): Promise<CertificationRecord | null> {
  const normalizedDid =
    normalizeDid(subjectDid);

  if (!normalizedDid) {
    return null;
  }

  const cached =
    certificationCache.get(
      normalizedDid
    );

  if (
    cached &&
    cached.expiresAt >
      Date.now()
  ) {
    return cached.value;
  }

  const agent =
    createAdminRepoAgent();

  try {
    const response =
      await agent.api.com.atproto.repo.getRecord(
        {
          repo:
            ADMIN_REPO_HANDLE,

          collection:
            CERTIFICATION_COLLECTION,

          rkey: normalizedDid,
        }
      );

    const parsed =
      parseCertificationRecord(
        response.data.value
      );

    certificationCache.set(
      normalizedDid,
      {
        value: parsed,
        expiresAt:
          Date.now() +
          CACHE_DURATION,
      }
    );

    return parsed;
  } catch {
    certificationCache.set(
      normalizedDid,
      {
        value: null,
        expiresAt:
          Date.now() +
          CACHE_DURATION,
      }
    );

    return null;
  }
}

/**
 * Vérifie si un compte possède actuellement une fleur.
 */
export async function isTrustedVerifier(
  subjectDid: string
): Promise<boolean> {
  const certification =
    await getKeloCertification(
      subjectDid
    );

  return (
    certification?.status ===
    "trusted-verifier"
  );
}

/**
 * Vérifie si une personne peut retirer une certification.
 *
 * Règles :
 *
 * - Kelo Social peut retirer toutes les certifications ;
 * - un certificateur peut retirer uniquement celles qu’il a attribuées ;
 * - les anciens records sont considérés comme attribués par Kelo Social.
 */
export function canRevokeCertification(
  certification:
    | CertificationRecord
    | null,
  requesterDid: string
): boolean {
  if (!certification) {
    return false;
  }

  const normalizedRequesterDid =
    normalizeDid(requesterDid);

  if (!normalizedRequesterDid) {
    return false;
  }

  if (
    KELO_ADMIN_DID &&
    normalizedRequesterDid ===
      normalizeDid(
        KELO_ADMIN_DID
      )
  ) {
    return true;
  }

  if (
    !certification.issuerDid
  ) {
    return false;
  }

  return (
    normalizedRequesterDid ===
    normalizeDid(
      certification.issuerDid
    )
  );
}

/**
 * Seul l’administrateur principal Kelo Social
 * peut attribuer ou retirer une fleur.
 */
export function canManageTrustedVerifiers(
  requesterDid: string
): boolean {
  if (!KELO_ADMIN_DID) {
    return false;
  }

  return (
    normalizeDid(requesterDid) ===
    normalizeDid(
      KELO_ADMIN_DID
    )
  );
}

/**
 * Vide le cache après une attribution ou une révocation.
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
