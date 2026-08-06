"use client";

import {
  ReactNode,
} from "react";

import VerificationRequiredDialog from "@/components/verification/VerificationRequiredDialog";

import {
  useIdentityVerification,
} from "@/hooks/useIdentityVerification";

interface VerificationGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Rend son contenu normalement pour un compte vérifié.
 *
 * Une vérification manuelle attribuée depuis le panneau administrateur
 * et une vérification automatique Kelo ID/Kelo Verify sont traitées de
 * la même manière, car elles créent toutes les deux un record dans
 * eu.kelosocial.identityverification.
 */
export default function VerificationGate({
  children,
  fallback,
}: VerificationGateProps) {
  const {
    checked,
    verified,
    dialogOpen,
    requireVerification,
    closeDialog,
  } = useIdentityVerification();

  if (!checked) {
    return null;
  }

  if (verified) {
    return <>{children}</>;
  }

  return (
    <>
      {fallback || (
        <button
          type="button"
          onClick={requireVerification}
          className="rounded-full bg-kelo-background px-4 py-2 text-sm font-bold text-kelo-text transition hover:bg-kelo-border/60"
        >
          Vérification requise
        </button>
      )}

      <VerificationRequiredDialog
        open={dialogOpen}
        onClose={closeDialog}
      />
    </>
  );
}
