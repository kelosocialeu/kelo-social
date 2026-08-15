import { createAppViewAgent } from "@/lib/atproto/appview";

/**
 * Système de vérification natif AT Protocol / Bluesky.
 */
export type VerificationBadgeType =
  | "verified"
  | "trusted-verifier"
  | null;

export interface VerificationIssuer {
  issuer: string;
  uri: string;
  isValid: boolean;
  createdAt: string;
}

interface NativeVerificationCacheEntry {
  verification: any | null;
  expiresAt: number;
}

const CACHE_DURATION = 5 * 60 * 1000;

const nativeVerificationCache = new Map<
  string,
  NativeVerificationCacheEntry
>();

function getActorKey(actor: any): string | null {
  const did =
    typeof actor?.did === "string"
      ? actor.did.trim().toLowerCase()
      : "";

  if (did) {
    return did;
  }

  const handle =
    typeof actor?.handle === "string"
      ? actor.handle.trim().toLowerCase()
      : "";

  return handle || null;
}

/**
 * Retourne le badge natif déjà présent sur l’objet actor.
 *
 * La priorité est volontairement :
 * certificateur de confiance > compte certifié.
 */
export function getVerificationBadge(
  actor: any
): VerificationBadgeType {
  const verification = actor?.verification;

  if (!verification) {
    return null;
  }

  if (
    verification.trustedVerifierStatus === "valid"
  ) {
    return "trusted-verifier";
  }

  if (verification.verifiedStatus === "valid") {
    return "verified";
  }

  return null;
}

/**
 * Récupère les données de vérification natives depuis l’AppView publique.
 *
 * Les objets actor retournés par l'AppView contiennent souvent déjà le champ
 * verification. Dans ce cas on l'utilise immédiatement, sans requête réseau
 * supplémentaire. C'est important sur les feeds/explorer/recherche où des
 * dizaines de badges sont affichés en même temps.
 */
export async function getPublicNativeVerification(
  actor: any
): Promise<any | null> {
  const key = getActorKey(actor);

  if (!key) {
    return null;
  }

  if (actor?.verification) {
    nativeVerificationCache.set(key, {
      verification: actor.verification,
      expiresAt: Date.now() + CACHE_DURATION,
    });
    return actor.verification;
  }

  const cached =
    nativeVerificationCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.verification;
  }

  try {
    const agent = createAppViewAgent();

    const response =
      await agent.api.app.bsky.actor.getProfile({
        actor: actor.did || actor.handle,
      });

    const verification =
      response.data.verification || null;

    nativeVerificationCache.set(key, {
      verification,
      expiresAt: Date.now() + CACHE_DURATION,
    });

    return verification;
  } catch (error) {
    console.error(
      "Impossible de récupérer la vérification native :",
      error
    );

    nativeVerificationCache.set(key, {
      verification: null,
      expiresAt: Date.now() + CACHE_DURATION,
    });

    return null;
  }
}

export function getVerificationIssuers(
  actor: any
): VerificationIssuer[] {
  return (
    actor?.verification?.verifications || []
  ).filter((verification: any) => verification.isValid);
}

/**
 * Récupère le profil d’un émetteur de certification.
 */
export async function getIssuerProfile(
  did: string
) {
  const agent = createAppViewAgent();

  const response =
    await agent.api.app.bsky.actor.getProfile({
      actor: did,
    });

  return response.data;
}
