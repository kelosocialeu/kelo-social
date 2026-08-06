"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

import AuthLayout from "@/components/layout/AuthLayout";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { loginWithKeloIdSession } from "@/services/auth.service";
import type { AtpSession } from "@/types/auth";

export default function KeloIdCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshSession } = useAuthContext();
  const [message, setMessage] = useState("Finalisation de la connexion Kelo ID...");
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
          `/api/kelo-id/login/qr/status?id=${encodeURIComponent(id)}&clientState=${encodeURIComponent(clientState)}`,
          { cache: "no-store" }
        );
        const data = await response.json();

        if (!response.ok || data.status !== "approved" || !data.session) {
          throw new Error(data.error || "La connexion Kelo ID n’a pas été confirmée.");
        }

        await loginWithKeloIdSession(data.session as AtpSession);
        refreshSession();

        if (!cancelled) {
          setMessage("Connexion réussie. Ouverture de Kelo Social...");
          router.replace("/feed");
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
  }, [searchParams, refreshSession, router]);

  return (
    <AuthLayout
      title="Connexion Kelo ID"
      tagline="Votre identité et votre session AT Protocol sont vérifiées avant l’ouverture du feed."
    >
      <section className="text-center">
        {!error ? (
          <p className="text-sm font-medium text-kelo-muted">{message}</p>
        ) : (
          <>
            <p role="alert" className="text-sm font-medium text-kelo-danger">{error}</p>
            <Link
              href="/login"
              className="mt-5 inline-block rounded-full bg-kelo-gradient px-6 py-3 font-bold text-white"
            >
              Retour à la connexion
            </Link>
          </>
        )}
      </section>
    </AuthLayout>
  );
}
