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

async function trackLoginActivity(
  session: ReturnType<typeof authService.getStoredSession>,
  method: "password" | "qr-kelo-id"
) {
  if (!session) return;

  const send = async () => {
    const response = await fetch("/api/login-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session, method }),
      keepalive: true,
      cache: "no-store",
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const data = await response.json();
        if (data?.error) message = data.error;
      } catch {}
      throw new Error(message);
    }
  };

  try {
    await send();
  } catch (firstError) {
    console.warn("Premier enregistrement de connexion échoué, nouvelle tentative :", firstError);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      await send();
    } catch (secondError) {
      console.error("Suivi de connexion indisponible après deux tentatives :", secondError);
    }
  }
}

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
        const session = await authService.login(
          credentials
        );

        await trackLoginActivity(session, "password");

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
