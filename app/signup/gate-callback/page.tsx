"use client";

import { useEffect, useState } from "react";

export default function GatekeeperCallbackPage() {
  const [message, setMessage] = useState("Validation en cours…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (!code || !state) {
      setMessage("La vérification n’a pas pu être récupérée. Fermez cette fenêtre et réessayez.");
      return;
    }

    const payload = {
      type: "kelo-gatekeeper-verification",
      code,
      state,
    };

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, window.location.origin);
      setMessage("Vérification réussie. Vous pouvez revenir à Kelo Social.");
      window.setTimeout(() => window.close(), 600);
      return;
    }

    try {
      sessionStorage.setItem("kelo-gatekeeper-verification", JSON.stringify(payload));
      setMessage("Vérification réussie. Revenez à la page d’inscription Kelo Social.");
    } catch {
      setMessage("Vérification réussie, mais Kelo Social n’a pas pu récupérer le résultat automatiquement.");
    }
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-kelo-background p-6 text-center text-kelo-text">
      <div className="max-w-md rounded-3xl border border-kelo-border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-extrabold">Vérification Kelo Social</h1>
        <p className="mt-3 text-sm text-kelo-muted">{message}</p>
      </div>
    </main>
  );
}
