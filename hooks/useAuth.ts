"use client";

import {
  useCallback,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  useAuthContext,
} from "@/components/providers/AuthProvider";

import * as authService from "@/services/auth.service";

import type {
  LoginCredentials,
} from "@/types/auth";

export function useAuth() {
  const router = useRouter();

  const {
    refreshSession,
    logout: logoutContext,
  } = useAuthContext();

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const login = useCallback(
    async (
      credentials: LoginCredentials
    ) => {
      setLoading(true);
      setError(null);

      try {
        await authService.login(
          credentials
        );

        /*
         * La session vient d'être écrite dans localStorage. On synchronise
         * explicitement AuthProvider avant d'ouvrir une page protégée afin
         * que useRequireAuth ne renvoie pas brièvement vers /login.
         */
        refreshSession();

        router.replace("/feed");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Une erreur inconnue est survenue."
        );
      } finally {
        setLoading(false);
      }
    },
    [refreshSession, router]
  );

  const logout = useCallback(() => {
    logoutContext();
    router.replace("/login");
  }, [logoutContext, router]);

  return {
    login,
    logout,
    loading,
    error,
  };
}
