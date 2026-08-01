import { getReadAgent } from "@/lib/atproto/read-agent";

/**
 * Système de vérification natif du réseau AT Protocol
 * (app.bsky.graph.verification), utilisé par Bluesky et compatible avec
 * n'importe quel PDS qui publie ce type d'enregistrement (bsky.social,
 * eurosky.social, etc.). Contrairement à un système propre à Kelo Social,
 * ça fonctionne automatiquement pour tout le réseau fédéré, sans action
 * de notre part — on ne fait que lire et afficher ce qui existe déjà.
 *
 * Le champ `verification` est déjà inclus dans les objets "author" et
 * "profile" renvoyés par l'AppView pour les comptes vérifiés — il n'y a
 * donc aucun appel réseau supplémentaire nécessaire pour l'afficher dans
 * le fil.
 */

export type VerificationBadgeType = "verified" | "trusted-verifier" | null;

export interface VerificationIssuer {
  did: string;
  uri: string;
  isValid: boolean;
  createdAt: string;
}

export function getVerificationBadge(actor: any): VerificationBadgeType {
  const v = actor?.verification;
  if (!v) return null;
  if (v.trustedVerifierStatus === "valid") return "trusted-verifier";
  if (v.verifiedStatus === "valid") return "verified";
  return null;
}

export function getVerificationIssuers(actor: any): VerificationIssuer[] {
  return (actor?.verification?.verifications || []).filter((v: any) => v.isValid);
}

/** Récupère le profil d'un émetteur de certification pour l'afficher dans la fenêtre "certifié par". */
export async function getIssuerProfile(did: string) {
  const agent = await getReadAgent();
  const res = await agent.api.app.bsky.actor.getProfile({ actor: did });
  return res.data;
}
