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
  IdentityVerificationType,
} from "@/lib/atproto/identity-verifications";
import { getOrStartKeloTrial } from "@/lib/atproto/kelo-trial";
import { syncKeloIdStatus } from "@/lib/kelo-id/status-sync";

import {
  getAuthenticatedAgent,
  getStoredSession,
} from "@/services/auth.service";

interface IdentityVerificationState {
  checked: boolean;
  loading: boolean;
  verified: boolean;
  identityVerified: boolean;
  trialActive: boolean;
  trialExpiresAt: string | null;
  verification: IdentityVerificationRecord | null;
  dialogOpen: boolean;
  refresh: () => Promise<void>;
  requireVerification: () => boolean;
  closeDialog: () => void;
}

const UNVERIFIED_REFRESH_MS = 15_000;
const VERIFIED_REFRESH_MS = 2 * 60_000;
const STORAGE_PREFIX = "kelo.identity-verification.";
const SUPPORTED_TYPES: IdentityVerificationType[] = [
  "human",
  "enterprise",
  "media",
  "university",
  "association",
  "institution",
];

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

function normalizeVerificationType(value: string): IdentityVerificationType {
  return SUPPORTED_TYPES.includes(value as IdentityVerificationType)
    ? (value as IdentityVerificationType)
    : "human";
}

export function useIdentityVerification(): IdentityVerificationState {
  const [verification, setVerification] =
    useState<IdentityVerificationRecord | null>(null);
  const [trialActive, setTrialActive] = useState(false);
  const [trialExpiresAt, setTrialExpiresAt] = useState<string | null>(null);
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
      setTrialActive(false);
      setTrialExpiresAt(null);
      setChecked(true);
      return;
    }

    const persisted = readPersistedVerification(session.did);

    if (!verificationRef.current && persisted) {
      verificationRef.current = persisted;
      setVerification(persisted);
      setTrialActive(false);
      setTrialExpiresAt(null);
      setChecked(true);
    }

    setLoading(true);

    try {
      // Source prioritaire pour les vérifications faites dans l'app Kelo ID.
      // L'Edge Function vérifie le jeton AT Protocol auprès du PDS avant de lire Supabase.
      try {
        const mobileStatus = await syncKeloIdStatus(session);
        if (mobileStatus.verified) {
          const mobileRecord: IdentityVerificationRecord = {
            subjectDid: session.did.toLowerCase(),
            subjectHandle: session.handle.replace(/^@/, "").toLowerCase(),
            verificationType: normalizeVerificationType(mobileStatus.verificationType),
            source: "kelo-id",
            assignmentMode: "automatic",
            issuedAt: mobileStatus.verifiedAt || new Date().toISOString(),
            schemaVersion: 1,
          };
          verificationRef.current = mobileRecord;
          setVerification(mobileRecord);
          persistVerification(session.did, mobileRecord);
          setTrialActive(false);
          setTrialExpiresAt(null);
          return;
        }
      } catch (syncError) {
        console.warn("Synchronisation Kelo ID/Supabase indisponible :", syncError);
      }

      clearIdentityVerificationCache(session.did);

      const record = await getIdentityVerification(session.did);
      verificationRef.current = record;
      setVerification(record);
      persistVerification(session.did, record);

      if (record) {
        setTrialActive(false);
        setTrialExpiresAt(null);
      } else {
        const { agent } = await getAuthenticatedAgent();
        const trial = await getOrStartKeloTrial(agent, session.did);
        setTrialActive(trial.active);
        setTrialExpiresAt(trial.expiresAt);
      }
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
        setTrialActive(false);
        setTrialExpiresAt(null);
      } else {
        try {
          const { agent } = await getAuthenticatedAgent();
          const trial = await getOrStartKeloTrial(agent, session.did);
          setTrialActive(trial.active);
          setTrialExpiresAt(trial.expiresAt);
        } catch {
          setTrialActive(false);
          setTrialExpiresAt(null);
        }
      }
    } finally {
      setChecked(true);
      setLoading(false);
    }
  }, []);

  const identityVerified = !!verification;
  const verified = identityVerified || trialActive;

  useEffect(() => {
    void refresh();

    const delay = identityVerified
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
  }, [refresh, identityVerified]);

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
    identityVerified,
    trialActive,
    trialExpiresAt,
    verification,
    dialogOpen,
    refresh,
    requireVerification,
    closeDialog,
  };
}
