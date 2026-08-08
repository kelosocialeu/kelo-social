"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const PENDING_LOGIN_KEY = "kelo-id.pending-login";

export default function KeloIdMobileLoginButton() {
  const pathname = usePathname();
  const [eligible, setEligible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const compactScreen = window.matchMedia("(max-width: 1024px)").matches;
    setEligible(coarsePointer || compactScreen);
  }, []);

  if (pathname !== "/login" || !eligible) return null;

  async function continueWithKeloId() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/kelo-id/login/qr/create", {
        method: "POST",
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Connexion Kelo ID impossible.");
      }

      const keloIdUrl = (process.env.NEXT_PUBLIC_KELO_ID_URL || "https://keloid.eu").replace(/\/$/, "");
      const callback = new URL("/kelo-id/callback", window.location.origin);
      callback.searchParams.set("id", data.id);
      callback.searchParams.set("clientState", data.clientState);

      // Conserver le challenge côté navigateur permet au callback mobile de
      // récupérer le bon flux même si le navigateur ou Kelo ID retire des
      // paramètres pendant la redirection.
      window.sessionStorage.setItem(
        PENDING_LOGIN_KEY,
        JSON.stringify({
          id: data.id,
          clientState: data.clientState,
          createdAt: Date.now(),
        })
      );

      const authorize = new URL("/authorize", keloIdUrl);
      authorize.searchParams.set("challenge", data.id);
      authorize.searchParams.set("returnTo", callback.toString());

      // replace évite de revenir sur une ancienne URL /authorize avec un
      // challenge déjà consommé lorsque l'utilisateur utilise Retour.
      window.location.replace(authorize.toString());
    } catch (loginError) {
      window.sessionStorage.removeItem(PENDING_LOGIN_KEY);
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Connexion Kelo ID impossible."
      );
      setLoading(false);
    }
  }

  return (
    <section className="mb-5 border-b border-kelo-border pb-5">
      <button
        type="button"
        onClick={continueWithKeloId}
        disabled={loading}
        className="w-full rounded-full bg-kelo-gradient px-5 py-3.5 font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Ouverture de Kelo ID..." : "Continuer avec Kelo ID"}
      </button>
      <p className="mt-2 text-center text-xs text-kelo-muted">
        Sur mobile ou tablette, confirmez la connexion dans Kelo ID puis revenez automatiquement ici.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-center text-sm font-medium text-kelo-danger">
          {error}
        </p>
      )}
    </section>
  );
}
