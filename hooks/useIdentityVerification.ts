"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  clearIdentityVerificationCache,
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

const UNVERIFIED_REFRESH_MS = 15_000;
const VERIFIED_REFRESH_MS = 2 * 60_000;
const STORAGE_PREFIX = "kelo.identity-verification.";

function storageKey(did: string) {
  return `${STORAGE_PREFIX}${did.trim().toLowerCase()}`;
}

function readPersistedVerification(
  did: string
): IdentityVerificationRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey(did));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as IdentityVerificationRecord;
    return parsed?.subjectDid ? parsed : null;
  } catch {
    return null;
  }
}

function persistVerification(
  did: string,
  record: IdentityVerificationRecord | null
) {
  if (typeof window === "undefined") return;

  try {
    if (record) {
      window.localStorage.setItem(
        storageKey(did),
        JSON.stringify(record)
      );
    } else {
      window.localStorage.removeItem(storageKey(did));
    }
  } catch {
    // Le stockage local est seulement un filet de sécurité hors ligne.
  }
}

export function useIdentityVerification(): IdentityVerificationState {
  const [verification, setVerification] =
    useState<IdentityVerificationRecord | null>(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const verificationRef = useRef<IdentityVerificationRecord | null>(null);

  useEffect(() => {
    verificationRef.current = verification;
  }, [verification]);

  const refresh = useCallback(async () => {
    const session = getStoredSession();

    if (!session?.did) {
      verificationRef.current = null;
      setVerification(null);
      setChecked(true);
      return;
    }

    const persisted = readPersistedVerification(session.did);

    if (!verificationRef.current && persisted) {
      verificationRef.current = persisted;
      setVerification(persisted);
      setChecked(true);
    }

    setLoading(true);

    try {
      // On force une lecture fraîche pour détecter rapidement une nouvelle
      // validation, mais une panne réseau ne doit jamais retirer un statut
      // précédemment confirmé.
      clearIdentityVerificationCache(session.did);

      const record = await getIdentityVerification(session.did);
      verificationRef.current = record;
      setVerification(record);
      persistVerification(session.did, record);
    } catch (error) {
      console.warn(
        "Vérification d’identité temporairement indisponible, dernier état conservé :",
        error
      );

      const fallback =
        verificationRef.current ||
        readPersistedVerification(session.did);

      if (fallback) {
        verificationRef.current = fallback;
        setVerification(fallback);
      }
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
    document.addEventListener("visibilitychange", runWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", runWhenVisible);
      document.removeEventListener("visibilitychange", runWhenVisible);
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
