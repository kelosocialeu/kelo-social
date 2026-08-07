"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useAuthContext } from "@/components/providers/AuthProvider";
import { loginWithKeloIdSession } from "@/services/auth.service";
import type { AtpSession } from "@/types/auth";

export default function KeloIdCallbackClient() {
  const searchParams = useSearchParams();
  const { refreshSession } = useAuthContext();
  const [message, setMessage] = useState(
    "Finalisation de la connexion Kelo ID..."
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const id = searchParams.get("id") || "";
    const clientState = searchParams.get("clientState") || "";

    if (!id || !clientState) {
      setError("Retour Kelo ID incomplet.");
      return;
    }

    let cancelled = false;

    async function completeLogin() {
      try {
        const response = await fetch(
          `/api/kelo-id/login/qr/status?id=${encodeURIComponent(
            id
          )}&clientState=${encodeURIComponent(clientState)}`,
          { cache: "no-store" }
        );
        const data = await response.json();

        if (
          !response.ok ||
          data.status !== "approved" ||
          !data.session
        ) {
          throw new Error(
            data.error ||
              "La connexion Kelo ID n’a pas été confirmée."
          );
        }

        setMessage(
          "Connexion confirmée. Ouverture de Kelo Social..."
        );

        await loginWithKeloIdSession(
          data.session as AtpSession
        );
        refreshSession();

        if (!cancelled) {
          // Navigation franche : AuthProvider redémarre avec la session qui
          // vient d'être persistée et aucune ancienne page de callback ne
          // peut rester affichée dans l'historique mobile.
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
            Retour à la connexion
          </Link>
        </>
      )}
    </section>
  );
}
