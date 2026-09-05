import {
  getIdentityVerification,
  IdentityVerificationRecord,
} from "@/lib/atproto/identity-verifications";
import { getOrStartKeloTrial, KeloTrialStatus } from "@/lib/atproto/kelo-trial";
import { getAuthenticatedAgent, getStoredSession } from "@/services/auth.service";

/**
 * Autorise les actions protégées si le compte est vérifié par Kelo ID
 * ou s'il se trouve encore dans les 48 heures suivant sa première connexion
 * à Kelo Social, quel que soit son PDS AT Protocol d'origine.
 */
export async function requireIdentityVerification(): Promise<{
  session: NonNullable<ReturnType<typeof getStoredSession>>;
  verification: IdentityVerificationRecord | null;
  trial?: KeloTrialStatus;
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

  try {
    const { agent } = await getAuthenticatedAgent();
    const trial = await getOrStartKeloTrial(agent, session.did);

    if (trial.active) {
      return {
        session,
        verification: null,
        trial,
      };
    }
  } catch (error) {
    console.warn("Impossible de vérifier la période d’essai Kelo Social :", error);
  }

  throw new Error(
    "Votre période d’essai de 2 jours sur Kelo Social est terminée. Vérifiez votre compte avec Kelo ID pour continuer."
  );
}
