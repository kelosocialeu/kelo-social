"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useAuthContext } from "@/components/providers/AuthProvider";
import { loginWithKeloIdSession } from "@/services/auth.service";
import type { AtpSession } from "@/types/auth";

const MAX_CALLBACK_ATTEMPTS = 12;
const CALLBACK_RETRY_DELAY_MS = 750;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
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

    const id = searchParams.get("id") || "";
    const clientState = searchParams.get("clientState") || "";

    if (!id || !clientState) {
      setError("Retour Kelo ID incomplet.");
      return;
    }

    let cancelled = false;

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
            // Les erreurs métier (compte non vérifié, accès QR à recréer, etc.)
            // ne gagneront rien à être répétées pendant plusieurs secondes.
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

        if (!cancelled) {
          // Navigation franche pour redémarrer AuthProvider à partir de la
          // session AT Protocol persistée et ne pas conserver le callback.
          window.location.replace("/feed");
        }
      } catch (callbackError) {
        if (!cancelled) {
          setError(
            callbackError instanceof Error
              ? callbackError.message
              : "Connexion Kelo ID impossible."
          );
        }
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
