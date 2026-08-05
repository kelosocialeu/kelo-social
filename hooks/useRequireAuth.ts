"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  useAuthContext,
} from "@/components/providers/AuthProvider";

/**
 * Protège une page cliente sans relire localStorage à chaque navigation.
 *
 * La session est chargée une seule fois dans AuthProvider puis réutilisée
 * par toutes les pages de l’application.
 */
export function useRequireAuth() {
  const router = useRouter();

  const {
    session,
    checked,
    handle,
    did,
  } = useAuthContext();

  useEffect(() => {
    if (
      checked &&
      !session
    ) {
      router.replace("/login");
    }
  }, [
    checked,
    session,
    router,
  ]);

  return {
    checked,
    handle,
    did,
    session,
    isAuthenticated: !!session,
  };
}
