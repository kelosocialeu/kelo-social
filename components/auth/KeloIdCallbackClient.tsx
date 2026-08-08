"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useAuthContext } from "@/components/providers/AuthProvider";
import {
  getStoredSession,
  loginWithKeloIdSession,
  restoreStoredSession,
} from "@/services/auth.service";
import type { AtpSession } from "@/types/auth";

const MAX_CALLBACK_ATTEMPTS = 12;
const CALLBACK_RETRY_DELAY_MS = 750;
const PENDING_LOGIN_KEY = "kelo-id.pending-login";
const PENDING_LOGIN_MAX_AGE_MS = 10 * 60 * 1000;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function readPendingLogin(): {
  id: string;
  clientState: string;
} | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_LOGIN_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      id?: string;
      clientState?: string;
      createdAt?: number;
    };

    if (
      !parsed.id ||
      !parsed.clientState ||
      !parsed.createdAt ||
      Date.now() - parsed.createdAt > PENDING_LOGIN_MAX_AGE_MS
    ) {
      window.sessionStorage.removeItem(PENDING_LOGIN_KEY);
      return null;
    }

    return {
      id: parsed.id,
      clientState: parsed.clientState,
    };
  } catch {
    window.sessionStorage.removeItem(PENDING_LOGIN_KEY);
    return null;
  }
}

export default function KeloIdCallbackClient() {
  const searchParams = useSearchParams();
  const { refreshSession } = useAuthContext();
  const startedRef = useRef(false);
  const [message, setMessage] = useState(
    "Finalisation de la connexion Kelo ID..."
  );
  const [error, setError] = useState("");

  useEffect(() => {
    // Le callback peut être réévalué pendant l'hydratation ou après une mise
    // à jour du contexte. Une connexion QR ne doit être finalisée qu'une fois.
    if (startedRef.current) return;
    startedRef.current = true;

    const pending = readPendingLogin();
    const id = searchParams.get("id") || pending?.id || "";
    const clientState =
      searchParams.get("clientState") || pending?.clientState || "";

    let cancelled = false;

    async function recoverExistingSession(): Promise<boolean> {
      if (!getStoredSession()) {
        return false;
      }

      try {
        const restored = await restoreStoredSession();

        if (!restored || cancelled) {
          return false;
        }

        refreshSession();
        window.sessionStorage.removeItem(PENDING_LOGIN_KEY);
        window.location.replace("/feed");
        return true;
      } catch {
        return false;
      }
    }

    if (!id || !clientState) {
      void recoverExistingSession().then((recovered) => {
        if (!recovered && !cancelled) {
          setError("Retour Kelo ID incomplet. Générez une nouvelle connexion.");
        }
      });

      return () => {
        cancelled = true;
      };
    }

    async function fetchReadySession(): Promise<AtpSession> {
      let lastError = "La connexion Kelo ID n’a pas été confirmée.";

      for (let attempt = 1; attempt <= MAX_CALLBACK_ATTEMPTS; attempt += 1) {
        if (cancelled) {
          throw new Error("Connexion annulée.");
        }

        try {
          const response = await fetch(
            `/api/kelo-id/login/qr/status?id=${encodeURIComponent(
              id
            )}&clientState=${encodeURIComponent(clientState)}`,
            { cache: "no-store" }
          );
          const data = await response.json();

          if (response.ok && data.status === "approved" && data.session) {
            return data.session as AtpSession;
          }

          if (data.status === "pending") {
            lastError = "Kelo ID finalise encore votre connexion...";
          } else if (data.status === "expired") {
            throw new Error("Cette connexion Kelo ID a expiré. Générez-en une nouvelle.");
          } else if (!response.ok) {
            // Les erreurs métier (compte non vérifié, challenge déjà utilisé,
            // etc.) ne doivent pas déclencher plusieurs consommations du QR.
            throw new Error(data.error || lastError);
          } else {
            lastError = data.error || lastError;
          }
        } catch (requestError) {
          if (
            requestError instanceof Error &&
            !/fetch|network|réseau/i.test(requestError.message)
          ) {
            throw requestError;
          }

          lastError =
            "Connexion temporairement indisponible. Nouvelle tentative...";
        }

        if (!cancelled) {
          setMessage(lastError);
        }

        if (attempt < MAX_CALLBACK_ATTEMPTS) {
          await wait(CALLBACK_RETRY_DELAY_MS);
        }
      }

      throw new Error(
        "Kelo ID a confirmé la connexion mais la session n’est pas encore disponible. Générez une nouvelle connexion et réessayez."
      );
    }

    async function completeLogin() {
      try {
        const session = await fetchReadySession();

        if (cancelled) return;

        setMessage(
          "Connexion confirmée. Ouverture de Kelo Social..."
        );

        await loginWithKeloIdSession(session);
        refreshSession();
        window.sessionStorage.removeItem(PENDING_LOGIN_KEY);

        if (!cancelled) {
          // Navigation franche pour redémarrer AuthProvider à partir de la
          // session AT Protocol persistée et ne pas conserver le callback.
          window.location.replace("/feed");
        }
      } catch (callbackError) {
        if (cancelled) return;

        // Si le navigateur revient deux fois sur le callback ou si Kelo ID
        // indique qu'un challenge est déjà consommé, une session peut déjà
        // avoir été enregistrée. On la valide avant d'afficher une erreur et
        // avant de demander inutilement une nouvelle déconnexion/reconnexion.
        if (await recoverExistingSession()) {
          return;
        }

        window.sessionStorage.removeItem(PENDING_LOGIN_KEY);
        setError(
          callbackError instanceof Error
            ? callbackError.message
            : "Connexion Kelo ID impossible."
        );
      }
    }

    void completeLogin();

    return () => {
      cancelled = true;
    };
  }, [searchParams, refreshSession]);

  return (
    <section className="text-center">
      {!error ? (
        <p className="text-sm font-medium text-kelo-muted">
          {message}
        </p>
      ) : (
        <>
          <p
            role="alert"
            className="text-sm font-medium text-kelo-danger"
          >
            {error}
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block rounded-full bg-kelo-gradient px-6 py-3 font-bold text-white"
          >
            Générer une nouvelle connexion
          </Link>
        </>
      )}
    </section>
  );
}
