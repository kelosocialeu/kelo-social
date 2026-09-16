"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { finishKeloPdsSignup } from "@/lib/atproto/oauth-signup";

export default function OAuthSignupCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Finalisation de la création de votre compte…");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await finishKeloPdsSignup();
        if (cancelled) return;

        if (!result?.session) {
          setMessage("La création du compte n’a pas pu être confirmée. Veuillez recommencer.");
          return;
        }

        setMessage("Compte Kelo Social créé avec succès. Redirection vers la connexion…");
        window.setTimeout(() => router.replace("/login"), 1200);
      } catch (error) {
        console.error("Kelo OAuth signup callback failed:", error);
        if (!cancelled) {
          setMessage("La création du compte a échoué. Veuillez recommencer l’inscription.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-kelo-background p-6">
      <div className="w-full max-w-md rounded-3xl border border-kelo-border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-kelo-primary/10 text-2xl">✓</div>
        <h1 className="text-2xl font-extrabold text-kelo-text">Kelo Social</h1>
        <p className="mt-3 text-sm leading-6 text-kelo-muted">{message}</p>
      </div>
    </main>
  );
}
