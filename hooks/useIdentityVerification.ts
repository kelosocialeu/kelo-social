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

const STATUS_REFRESH_INTERVAL_MS = 30_000;

export function useIdentityVerification(): IdentityVerificationState {
  const [verification, setVerification] =
    useState<IdentityVerificationRecord | null>(
      null
    );

  const [checked, setChecked] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const refresh = useCallback(async () => {
    const session = getStoredSession();

    if (!session?.did) {
      setVerification(null);
      setChecked(true);
      return;
    }

    setLoading(true);

    try {
      const record =
        await getIdentityVerification(
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

  useEffect(() => {
    refresh();

    const interval =
      window.setInterval(() => {
        refresh();
      }, STATUS_REFRESH_INTERVAL_MS);

    return () =>
      window.clearInterval(interval);
  }, [refresh]);

  const verified = !!verification;

  const requireVerification =
    useCallback(() => {
      if (verified) {
        return true;
      }

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
