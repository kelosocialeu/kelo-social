"use client";

import { useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/layout/AuthLayout";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { PDS_PROVIDERS, DEFAULT_PDS_URL } from "@/lib/atproto/pds";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pdsUrl, setPdsUrl] = useState(DEFAULT_PDS_URL);
  const { login, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ identifier, password, pdsUrl });
  };

  return (
    <AuthLayout
      title="Connexion"
      tagline="Accédez à votre espace souverain et fédéré sur l'AT Protocol."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Select label="Fournisseur d'identité (PDS)" value={pdsUrl} onChange={(e) => setPdsUrl(e.target.value)}>
          {PDS_PROVIDERS.map((provider) => (
            <option key={provider.id} value={provider.url}>
              {provider.label}
            </option>
          ))}
        </Select>

        <Input
          label="Identifiant / Handle"
          type="text"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="votre-compte.kelosocial.eu"
        />

        <Input
          label="Mot de passe"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Votre mot de passe"
        />

        {error && <p className="text-sm font-medium text-kelo-danger">{error}</p>}

        <Button type="submit" loading={loading} loadingText="Connexion en cours...">
          Se connecter
        </Button>

        <Link
          href="/signup"
          className="w-full rounded-full bg-kelo-background py-3.5 text-center font-bold text-kelo-text transition hover:bg-kelo-border/60"
        >
          Créer un nouveau compte
        </Link>

        <div className="mt-2 flex justify-center">
          <Link href="/" className="text-sm text-kelo-muted transition-colors hover:text-kelo-text">
            ← Retour à l'accueil
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
