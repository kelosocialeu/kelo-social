"use client";

import { useState } from "react";
import Link from "next/link";

import AuthLayout from "@/components/layout/AuthLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type Step = "request" | "confirm" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function requestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (!identifier.trim() && !email.trim()) {
      setError("Saisissez votre handle ou votre adresse e-mail.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, email }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Envoi du code impossible.");
      }

      setMessage(data.message || "Code envoyé.");
      setStep("confirm");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Envoi du code impossible."
      );
    } finally {
      setLoading(false);
    }
  }

  async function confirmReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, token, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Réinitialisation impossible.");
      }

      setMessage(data.message || "Mot de passe modifié.");
      setStep("done");
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "Réinitialisation impossible."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Mot de passe oublié"
      tagline="Saisissez votre handle ou votre adresse e-mail. Un seul des deux suffit."
    >
      {step === "request" && (
        <form onSubmit={requestReset} className="flex flex-col gap-5">
          <Input
            label="Identifiant / Handle (facultatif)"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="votre-compte.kelosocial.eu"
          />

          <div className="text-center text-xs font-semibold uppercase tracking-wide text-kelo-muted">
            ou
          </div>

          <Input
            label="Adresse e-mail (facultatif)"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="vous@exemple.com"
          />

          <div className="rounded-2xl bg-kelo-background p-4 text-xs text-kelo-muted">
            <p>
              Sur le PDS Kelo, un handle seul suffit : Kelo Social retrouve l’adresse associée côté serveur sans l’afficher.
            </p>
            <p className="mt-2">
              Une adresse e-mail seule permet également de demander un code pour un compte Kelo. Pour un PDS externe, saisissez le handle et l’e-mail afin que Kelo Social sache quel serveur contacter.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-kelo-danger">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} loadingText="Envoi du code...">
            Envoyer le code de récupération
          </Button>
        </form>
      )}

      {step === "confirm" && (
        <form onSubmit={confirmReset} className="flex flex-col gap-5">
          {message && (
            <p className="rounded-2xl bg-kelo-background p-4 text-sm text-kelo-text">
              {message}
            </p>
          )}

          <Input
            label="Code reçu par e-mail"
            type="text"
            required
            autoComplete="one-time-code"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Code de réinitialisation"
          />

          <Input
            label="Nouveau mot de passe"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Au moins 8 caractères"
          />

          <Input
            label="Confirmer le nouveau mot de passe"
            type="password"
            required
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="Retapez le mot de passe"
          />

          {error && (
            <p role="alert" className="text-sm font-medium text-kelo-danger">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} loadingText="Modification...">
            Modifier le mot de passe
          </Button>

          <button
            type="button"
            onClick={() => {
              setStep("request");
              setToken("");
              setPassword("");
              setConfirmation("");
              setMessage("");
              setError("");
            }}
            className="text-sm font-semibold text-kelo-muted hover:text-kelo-text"
          >
            Renvoyer un code
          </button>
        </form>
      )}

      {step === "done" && (
        <section className="flex flex-col gap-5 text-center">
          <div className="rounded-2xl bg-kelo-background p-5">
            <h2 className="text-lg font-extrabold text-kelo-text">
              Mot de passe modifié
            </h2>
            <p className="mt-2 text-sm text-kelo-muted">{message}</p>
          </div>

          <Link
            href="/login"
            className="w-full rounded-full bg-kelo-gradient py-3.5 text-center font-bold text-white shadow-sm transition hover:opacity-90"
          >
            Retour à la connexion
          </Link>
        </section>
      )}

      {step !== "done" && (
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-kelo-muted transition-colors hover:text-kelo-text"
          >
            ← Retour à la connexion
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
