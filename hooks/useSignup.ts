"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import * as authService from "@/services/auth.service";
import { SignupPayload } from "@/types/auth";

export function useSignup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signup = useCallback(
    async (payload: SignupPayload) => {
      setLoading(true);
      setError(null);
      try {
        await authService.signup(payload);
        router.push("/login");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur inconnue est survenue.");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  return { signup, loading, error };
}
