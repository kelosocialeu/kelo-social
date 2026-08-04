"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import AuthLayout from "@/components/layout/AuthLayout";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useSignup } from "@/hooks/useSignup";

const SIGNUP_PDS_PROVIDERS = [
  {
    id: "kelo",
    label: "Kelo Social",
    url: "https://pds.kelosocial.eu",
  },
];

export default function SignupPage() {
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [pdsUrl, setPdsUrl] = useState(SIGNUP_PDS_PROVIDERS[0].url);
  const [hcaptchaToken, setHcaptchaToken] = useState("");

  const captchaRef = useRef<HCaptcha>(null);
  const { signup, loading, error } = useSignup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hcaptchaToken) return;

    await signup({ handle, email, password, birthDate, hcaptchaToken, pdsUrl });
    captchaRef.current?.resetCaptcha();
    setHcaptchaToken("");
  };

  return (
    <AuthLayout title="Inscription" tagline="Rejoignez le réseau social souverain et décentralisé.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select label="Hébergé sur le PDS" value={pdsUrl} onChange={(e) => setPdsUrl(e.target.value)}>
          {SIGNUP_PDS_PROVIDERS.map((provider) => (
            <option key={provider.id} value={provider.url}>
              {provider.label}
            </option>
          ))}
        </Select>

        <Input
          label="Date de naissance (18 ans minimum)"
          type="date"
          required
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />

        <div>
          <Input
            label="Nom d'utilisateur (Handle)"
            type="text"
            required
            startAdornment="@"
            placeholder="votre-nom"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
          <p className="mt-1 text-xs text-kelo-muted">
            Votre nom final sera @{handle ? handle : "votre-nom"}.kelosocial.eu
          </p>
        </div>

        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre.email@exemple.com"
        />

        <Input
          label="Mot de passe"
          type={showPassword ? "text" : "password"}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Votre mot de passe sécurisé"
          endAdornment={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-sm font-medium text-kelo-muted transition-colors hover:text-kelo-secondary"
            >
              {showPassword ? "Masquer" : "Voir"}
            </button>
          }
        />

        <div className="my-2 flex justify-center">
          <HCaptcha
            ref={captchaRef}
            sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ""}
            onVerify={(token) => setHcaptchaToken(token)}
            onExpire={() => setHcaptchaToken("")}
          />
        </div>

        {error && <p className="text-center text-sm font-medium text-kelo-danger">{error}</p>}

        <div className="mt-2 flex gap-4">
          <Link
            href="/login"
            className="flex w-1/2 items-center justify-center rounded-full bg-kelo-background py-3 text-center font-bold text-kelo-text transition-colors hover:bg-kelo-border/60"
          >
            Déjà un compte ?
          </Link>
          <Button type="submit" loading={loading} loadingText="Création..." className="w-1/2">
            S'inscrire
          </Button>
        </div>

        <div className="mt-2 flex justify-center">
          <Link href="/" className="text-sm text-kelo-muted transition-colors hover:text-kelo-text">
            Retour à l'accueil
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
