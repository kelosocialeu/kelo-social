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

const UNVERIFIED_REFRESH_MS = 60_000;
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

interface SharedVerificationState {
  record: IdentityVerificationRecord | null;
  trialActive: boolean;
  trialExpiresAt: string | null;
  updatedAt: number;
}

const sharedVerificationCache = new Map<string, SharedVerificationState>();
const sharedVerificationRequests = new Map<string, Promise<SharedVerificationState>>();
const SHARED_UNVERIFIED_TTL_MS = 30_000;
const SHARED_VERIFIED_TTL_MS = 2 * 60_000;

async function loadVerificationState(session: NonNullable<ReturnType<typeof getStoredSession>>): Promise<SharedVerificationState> {
  const did = session.did.toLowerCase();
  const cached = sharedVerificationCache.get(did);
  if (cached) {
    const ttl = cached.record ? SHARED_VERIFIED_TTL_MS : SHARED_UNVERIFIED_TTL_MS;
    if (Date.now() - cached.updatedAt < ttl) {
      return cached;
    }
  }

  const pending = sharedVerificationRequests.get(did);
  if (pending) return pending;

  const request = (async (): Promise<SharedVerificationState> => {
    try {
      // Kelo ID is the preferred source. Only one request is allowed for a DID
      // even when dozens of PostCards mount at the same time.
      try {
        const mobileStatus = await syncKeloIdStatus(session);
        if (mobileStatus.verified) {
          const state: SharedVerificationState = {
            record: {
              subjectDid: did,
              subjectHandle: session.handle.replace(/^@/, "").toLowerCase(),
              verificationType: normalizeVerificationType(mobileStatus.verificationType),
              source: "kelo-id",
              assignmentMode: "automatic",
              issuedAt: mobileStatus.verifiedAt || new Date().toISOString(),
              schemaVersion: 1,
            },
            trialActive: false,
            trialExpiresAt: null,
            updatedAt: Date.now(),
          };
          sharedVerificationCache.set(did, state);
          persistVerification(session.did, state.record);
          return state;
        }
      } catch (syncError) {
        console.warn("Synchronisation Kelo ID/Supabase indisponible :", syncError);
      }

      clearIdentityVerificationCache(session.did);
      const record = await getIdentityVerification(session.did);

      if (record) {
        const state: SharedVerificationState = {
          record,
          trialActive: false,
          trialExpiresAt: null,
          updatedAt: Date.now(),
        };
        sharedVerificationCache.set(did, state);
        persistVerification(session.did, record);
        return state;
      }

      const { agent } = await getAuthenticatedAgent();
      const trial = await getOrStartKeloTrial(agent, session.did);
      const state: SharedVerificationState = {
        record: null,
        trialActive: trial.active,
        trialExpiresAt: trial.expiresAt,
        updatedAt: Date.now(),
      };
      sharedVerificationCache.set(did, state);
      persistVerification(session.did, null);
      return state;
    } catch (error) {
      console.warn("Vérification d’identité temporairement indisponible :", error);
      const persisted = readPersistedVerification(session.did);
      const state: SharedVerificationState = {
        record: persisted,
        trialActive: false,
        trialExpiresAt: null,
        updatedAt: Date.now(),
      };
      sharedVerificationCache.set(did, state);
      return state;
    } finally {
      sharedVerificationRequests.delete(did);
    }
  })();

  sharedVerificationRequests.set(did, request);
  return request;
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
      const state = await loadVerificationState(session);
      verificationRef.current = state.record;
      setVerification(state.record);
      setTrialActive(state.trialActive);
      setTrialExpiresAt(state.trialExpiresAt);
      if (state.record) persistVerification(session.did, state.record);
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
