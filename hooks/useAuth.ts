"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import * as authService from "@/services/auth.service";
import { LoginCredentials } from "@/types/auth";

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setLoading(true);
      setError(null);
      try {
        await authService.login(credentials);
        router.push("/feed");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur inconnue est survenue.");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    authService.logout();
    router.push("/login");
  }, [router]);

  return { login, logout, loading, error };
}
