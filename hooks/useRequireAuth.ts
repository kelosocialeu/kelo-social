"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredSession } from "@/services/auth.service";

/**
 * Protège une page cliente : redirige vers /login si aucune session valide
 * n'est trouvée dans ce navigateur. Tant que la vérification n'est pas
 * terminée (`checked === false`), on n'affiche rien de protégé — ça évite
 * un flash de contenu avant la redirection.
 */
export function useRequireAuth() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [handle, setHandle] = useState("");

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      router.push("/login");
      return;
    }
    setHandle(session.handle);
    setChecked(true);
  }, [router]);

  return { checked, handle };
}
