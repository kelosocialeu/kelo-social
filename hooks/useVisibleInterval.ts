"use client";

import { useEffect } from "react";

/**
 * Exécute une fonction à intervalle régulier uniquement lorsque l’onglet
 * est visible. Évite les requêtes inutiles en arrière-plan.
 */
export function useVisibleInterval(
  callback: () => void | Promise<void>,
  delayMs: number,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled || delayMs <= 0) {
      return;
    }

    const run = () => {
      if (document.visibilityState === "visible") {
        void callback();
      }
    };

    const interval = window.setInterval(run, delayMs);
    window.addEventListener("focus", run);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", run);
    };
  }, [callback, delayMs, enabled]);
}
