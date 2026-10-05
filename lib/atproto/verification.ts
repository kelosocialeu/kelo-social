import { createAppViewAgent } from "@/lib/atproto/appview";

/**
 * Système de vérification natif AT Protocol / Bluesky.
 */
export type VerificationBadgeType = "verified" | "trusted-verifier" | null;

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

interface PendingLookup {
  promise: Promise<any | null>;
  resolve: (value: any | null) => void;
}

const CACHE_DURATION = 5 * 60 * 1000;
const MAX_BATCH_SIZE = 25;

const nativeVerificationCache = new Map<string, NativeVerificationCacheEntry>();
const pendingNativeLookups = new Map<string, PendingLookup>();
let queuedNativeLookups = new Set<string>();
let nativeLookupTimer: ReturnType<typeof setTimeout> | null = null;

function getActorKey(actor: any): string | null {
  const did = typeof actor?.did === "string" ? actor.did.trim().toLowerCase() : "";
  if (did) return did;

  const handle = typeof actor?.handle === "string" ? actor.handle.trim().toLowerCase() : "";
  return handle || null;
}

export function getVerificationBadge(actor: any): VerificationBadgeType {
  const verification = actor?.verification;
  if (!verification) return null;
  if (verification.trustedVerifierStatus === "valid") return "trusted-verifier";
  if (verification.verifiedStatus === "valid") return "verified";
  return null;
}

function getCachedVerification(key: string): any | null | undefined {
  const cached = nativeVerificationCache.get(key);
  if (!cached) return undefined;
  if (cached.expiresAt > Date.now()) return cached.verification;
  nativeVerificationCache.delete(key);
  return undefined;
}

function queueNativeLookup(key: string) {
  queuedNativeLookups.add(key);
  if (nativeLookupTimer) return;

  nativeLookupTimer = setTimeout(() => {
    nativeLookupTimer = null;
    void flushNativeLookups();
  }, 0);
}

async function flushNativeLookups() {
  const keys = Array.from(queuedNativeLookups);
  queuedNativeLookups = new Set();

  if (!keys.length) return;

  try {
    const agent = createAppViewAgent();

    for (let start = 0; start < keys.length; start += MAX_BATCH_SIZE) {
      const batch = keys.slice(start, start + MAX_BATCH_SIZE);
      const response = await agent.api.app.bsky.actor.getProfiles({ actors: batch });

      const returned = new Map<string, any | null>();
      for (const profile of response.data.profiles || []) {
        const profileKey = getActorKey(profile);
        if (profileKey) returned.set(profileKey, profile.verification || null);
      }

      for (const key of batch) {
        const verification = returned.get(key) ?? null;
        nativeVerificationCache.set(key, {
          verification,
          expiresAt: Date.now() + CACHE_DURATION,
        });

        const pending = pendingNativeLookups.get(key);
        pendingNativeLookups.delete(key);
        pending?.resolve(verification);
      }
    }
  } catch (error) {
    console.error("Impossible de récupérer les vérifications natives :", error);

    for (const key of keys) {
      nativeVerificationCache.set(key, {
        verification: null,
        expiresAt: Date.now() + CACHE_DURATION,
      });

      const pending = pendingNativeLookups.get(key);
      pendingNativeLookups.delete(key);
      pending?.resolve(null);
    }
  }
}

/**
 * Récupère les données de vérification natives depuis l’AppView publique.
 *
 * Les profils manquants sont regroupés dans des appels getProfiles() de
 * maximum 25 acteurs, évitant une requête réseau par badge dans le fil.
 */
export async function getPublicNativeVerification(actor: any): Promise<any | null> {
  const key = getActorKey(actor);
  if (!key) return null;

  if (actor?.verification) {
    nativeVerificationCache.set(key, {
      verification: actor.verification,
      expiresAt: Date.now() + CACHE_DURATION,
    });
    return actor.verification;
  }

  const cached = getCachedVerification(key);
  if (cached !== undefined) return cached;

  const pending = pendingNativeLookups.get(key);
  if (pending) return pending.promise;

  let resolve!: (value: any | null) => void;
  const promise = new Promise<any | null>((res) => {
    resolve = res;
  });

  pendingNativeLookups.set(key, { promise, resolve });
  queueNativeLookup(key);
  return promise;
}

export function getVerificationIssuers(actor: any): VerificationIssuer[] {
  return (actor?.verification?.verifications || []).filter(
    (verification: any) => verification.isValid
  );
}

/**
 * Récupère le profil d’un émetteur de certification.
 */
export async function getIssuerProfile(did: string) {
  const agent = createAppViewAgent();
  const response = await agent.api.app.bsky.actor.getProfile({ actor: did });
  return response.data;
}
