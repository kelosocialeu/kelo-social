"use client";

import { useEffect, useState } from "react";
import { getStoredSession } from "@/services/auth.service";

/**
 * Détermine si l'utilisateur connecté est administrateur, en le vérifiant
 * côté serveur (voir app/api/admin/verify). Jamais de vérification basée
 * uniquement sur le contenu du handle côté client.
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      setChecked(true);
      return;
    }

    fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
    })
      .then((res) => res.json())
      .then((data) => setIsAdmin(!!data.isAdmin))
      .catch(() => setIsAdmin(false))
      .finally(() => setChecked(true));
  }, []);

  return { isAdmin, checked };
}
