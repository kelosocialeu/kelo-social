import {
  getIdentityVerification,
  IdentityVerificationRecord,
} from "@/lib/atproto/identity-verifications";
import { getStoredSession } from "@/services/auth.service";

/**
 * Vérifie qu'une session existe et qu'un record de vérification d'identité
 * est présent. Les validations manuelles et automatiques sont acceptées.
 */
export async function requireIdentityVerification(): Promise<{
  session: NonNullable<ReturnType<typeof getStoredSession>>;
  verification: IdentityVerificationRecord;
}> {
  const session = getStoredSession();

  if (!session) {
    throw new Error("Vous devez être connecté.");
  }

  const verification = await getIdentityVerification(
    session.did
  );

  if (!verification) {
    throw new Error(
      "Cette action nécessite un compte vérifié."
    );
  }

  return {
    session,
    verification,
  };
}
