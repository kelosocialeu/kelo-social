"use client";

import { useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/layout/AuthLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading, error } = useAuth();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await login({ identifier, password });

  return (
    <AuthLayout
      title="Connexion"
      tagline="Accédez à votre espace souverain et fédéré sur l’AT Protocol."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Input
          label="Identifiant / Handle"
          type="text"
          required
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="votre-compte.wsocial.eu"
        />

        <p className="-mt-3 text-xs text-kelo-muted">
          Kelo Social détecte automatiquement le PDS associé à votre compte.
        </p>

        <Input
          label="Mot de passe"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Votre mot de passe"
        />

        {error && (
          <p
            role="alert"
            className="text-sm font-medium text-kelo-danger"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          loading={loading}
          loadingText="Connexion en cours..."
        >
          Se connecter
        </Button>

        <Link
          href="/signup"
          className="w-full rounded-full bg-kelo-background py-3.5 text-center font-bold text-kelo-text transition hover:bg-kelo-border/60"
        >
          Créer un nouveau compte
        </Link>

        <div className="mt-2 flex justify-center">
          <Link
            href="/"
            className="text-sm text-kelo-muted transition-colors hover:text-kelo-text"
          >
            ← Retour à l’accueil
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
