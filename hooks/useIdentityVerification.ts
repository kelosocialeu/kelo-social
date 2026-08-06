"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getIdentityVerification,
  IdentityVerificationRecord,
} from "@/lib/atproto/identity-verifications";

import {
  getStoredSession,
} from "@/services/auth.service";

interface IdentityVerificationState {
  checked: boolean;
  loading: boolean;
  verified: boolean;
  verification: IdentityVerificationRecord | null;
  dialogOpen: boolean;
  refresh: () => Promise<void>;
  requireVerification: () => boolean;
  closeDialog: () => void;
}

const UNVERIFIED_REFRESH_MS = 5_000;
const VERIFIED_REFRESH_MS = 60_000;

export function useIdentityVerification(): IdentityVerificationState {
  const [verification, setVerification] =
    useState<IdentityVerificationRecord | null>(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refresh = useCallback(async () => {
    const session = getStoredSession();

    if (!session?.did) {
      setVerification(null);
      setChecked(true);
      return;
    }

    setLoading(true);

    try {
      const record = await getIdentityVerification(
        session.did
      );
      setVerification(record);
    } catch (error) {
      console.error(
        "Impossible de vérifier le statut d’identité :",
        error
      );
      setVerification(null);
    } finally {
      setChecked(true);
      setLoading(false);
    }
  }, []);

  const verified = !!verification;

  useEffect(() => {
    void refresh();

    const delay = verified
      ? VERIFIED_REFRESH_MS
      : UNVERIFIED_REFRESH_MS;

    const runWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    const interval = window.setInterval(
      runWhenVisible,
      delay
    );

    window.addEventListener("focus", runWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", runWhenVisible);
    };
  }, [refresh, verified]);

  const requireVerification = useCallback(() => {
    if (verified) return true;

    setDialogOpen(true);
    return false;
  }, [verified]);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  return {
    checked,
    loading,
    verified,
    verification,
    dialogOpen,
    refresh,
    requireVerification,
    closeDialog,
  };
}
