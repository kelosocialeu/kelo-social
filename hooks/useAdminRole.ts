"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getStoredSession,
} from "@/services/auth.service";

export interface AdminRoleState {
  checked: boolean;
  did: string;
  handle: string;

  isAdmin: boolean;
  isTrustedVerifier: boolean;

  canCertify: boolean;
  canManageTrustedVerifiers: boolean;
  canManageIdentity: boolean;
  canViewGlobalCertificationHistory: boolean;
}

const EMPTY_ROLE: AdminRoleState = {
  checked: false,
  did: "",
  handle: "",

  isAdmin: false,
  isTrustedVerifier: false,

  canCertify: false,
  canManageTrustedVerifiers: false,
  canManageIdentity: false,
  canViewGlobalCertificationHistory: false,
};

let cachedRole:
  | AdminRoleState
  | null = null;

let cachedSessionDid = "";

let pendingRequest:
  | Promise<AdminRoleState>
  | null = null;

async function fetchRole(): Promise<AdminRoleState> {
  const session = getStoredSession();

  if (!session) {
    return {
      ...EMPTY_ROLE,
      checked: true,
    };
  }

  if (
    cachedRole &&
    cachedSessionDid === session.did
  ) {
    return cachedRole;
  }

  if (pendingRequest) {
    return pendingRequest;
  }

  pendingRequest = fetch("/api/admin/role", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(session),
  })
    .then(async (response) => {
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de vérifier les droits."
        );
      }

      const role: AdminRoleState = {
        checked: true,
        did:
          typeof data.did === "string"
            ? data.did
            : session.did,
        handle:
          typeof data.handle === "string"
            ? data.handle
            : session.handle,

        isAdmin: !!data.isAdmin,
        isTrustedVerifier:
          !!data.isTrustedVerifier,

        canCertify: !!data.canCertify,
        canManageTrustedVerifiers:
          !!data.canManageTrustedVerifiers,
        canManageIdentity:
          !!data.canManageIdentity,
        canViewGlobalCertificationHistory:
          !!data.canViewGlobalCertificationHistory,
      };

      cachedRole = role;
      cachedSessionDid = session.did;

      return role;
    })
    .catch((error) => {
      console.error(
        "Impossible de vérifier le rôle :",
        error
      );

      return {
        ...EMPTY_ROLE,
        checked: true,
        did: session.did,
        handle: session.handle,
      };
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

export function clearAdminRoleCache(): void {
  cachedRole = null;
  cachedSessionDid = "";
  pendingRequest = null;
}

export function useAdminRole() {
  const [role, setRole] =
    useState<AdminRoleState>(
      cachedRole || EMPTY_ROLE
    );

  useEffect(() => {
    let cancelled = false;

    fetchRole().then((nextRole) => {
      if (!cancelled) {
        setRole(nextRole);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshRole = async () => {
    clearAdminRoleCache();

    const nextRole = await fetchRole();
    setRole(nextRole);

    return nextRole;
  };

  return {
    ...role,
    refreshRole,
  };
}
