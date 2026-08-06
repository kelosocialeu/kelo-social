"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

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
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Connexion Kelo ID impossible.");
      }

      const keloIdUrl = (process.env.NEXT_PUBLIC_KELO_ID_URL || "https://keloid.eu").replace(/\/$/, "");
      const callback = new URL("/kelo-id/callback", window.location.origin);
      callback.searchParams.set("id", data.id);
      callback.searchParams.set("clientState", data.clientState);

      const authorize = new URL("/authorize", keloIdUrl);
      authorize.searchParams.set("challenge", data.id);
      authorize.searchParams.set("returnTo", callback.toString());

      window.location.assign(authorize.toString());
    } catch (loginError) {
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
