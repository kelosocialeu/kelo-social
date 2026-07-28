import { getReadAgent } from "@/lib/atproto/read-agent";

/**
 * Collection AT Protocol personnalisée dans laquelle @kelosocial.eu publie
 * les certifications. Reverse-DNS de kelosocial.eu, convention standard
 * des NSID AT Protocol pour les lexicons "app-specific".
 */
export const CERTIFICATION_COLLECTION = "eu.kelosocial.certification";

export const ADMIN_REPO_HANDLE = "kelosocial.eu";

export type CertificationStatus = "certified" | "trusted-verifier";

export interface CertificationRecord {
  subjectDid: string;
  subjectHandle: string;
  status: CertificationStatus;
  issuedAt: string;
}

/**
 * Récupère toutes les certifications publiées par @kelosocial.eu.
 * Lisible par tout le monde, sans authentification.
 */
export async function listCertifications(): Promise<CertificationRecord[]> {
  const agent = await getReadAgent();
  const res = await agent.api.com.atproto.repo.listRecords({
    repo: ADMIN_REPO_HANDLE,
    collection: CERTIFICATION_COLLECTION,
    limit: 100,
  });

  return res.data.records.map((r: any) => r.value as CertificationRecord);
}
