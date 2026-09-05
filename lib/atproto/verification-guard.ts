import {
  getIdentityVerification,
  IdentityVerificationRecord,
} from "@/lib/atproto/identity-verifications";
import { getStoredSession } from "@/services/auth.service";

interface TrialStatus {
  active: boolean;
  expiresAt?: string;
}

async function getTrialStatus(did: string): Promise<TrialStatus> {
  try {
    const response = await fetch(`/api/trial/status?did=${encodeURIComponent(did)}`, {
      cache: "no-store",
    });
    if (!response.ok) return { active: false };
    return (await response.json()) as TrialStatus;
  } catch {
    return { active: false };
  }
}

/**
 * Autorise les actions protégées si le compte est vérifié par Kelo ID
 * ou s'il se trouve encore dans sa période d'essai de 48 heures.
 */
export async function requireIdentityVerification(): Promise<{
  session: NonNullable<ReturnType<typeof getStoredSession>>;
  verification: IdentityVerificationRecord | null;
  trial?: TrialStatus;
}> {
  const session = getStoredSession();

  if (!session) {
    throw new Error("Vous devez être connecté.");
  }

  const verification = await getIdentityVerification(session.did);

  if (verification) {
    return {
      session,
      verification,
    };
  }

  const trial = await getTrialStatus(session.did);

  if (trial.active) {
    return {
      session,
      verification: null,
      trial,
    };
  }

  throw new Error(
    "Votre période d’essai de 2 jours est terminée. Vérifiez votre compte avec Kelo ID pour continuer."
  );
}
