"use client";

import { useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/layout/AuthLayout";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useSignup } from "@/hooks/useSignup";
import { useTranslation } from "@/components/providers/TranslationProvider";

const SIGNUP_PDS_PROVIDERS = [
  { id: "kelo", label: "Kelo Social", url: "https://pds.kelosocial.eu" },
];

const GATEKEEPER_URL = (
  process.env.NEXT_PUBLIC_KELO_GATEKEEPER_URL || "https://pds.kelosocial.eu"
).replace(/\/$/, "");

export default function SignupPage() {
  const { t } = useTranslation();
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [pdsUrl, setPdsUrl] = useState(SIGNUP_PDS_PROVIDERS[0].url);
  const [verificationError, setVerificationError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const { signup, loading, error } = useSignup();

  const completeSignupWithCode = async (verificationCode: string) => {
    await signup({ handle, email, password, birthDate, pdsUrl, verificationCode });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError("");
    if (!handle || !email || !password || !birthDate) return;

    const fullHandle = handle.includes(".") ? handle : `${handle}.kelosocial.eu`;
    const state = crypto.randomUUID();
    const callbackUrl = `${window.location.origin}/signup/gate-callback`;
    const gateUrl = new URL(`${GATEKEEPER_URL}/gate/signup`);
    gateUrl.searchParams.set("handle", fullHandle);
    gateUrl.searchParams.set("state", state);
    gateUrl.searchParams.set("redirect_url", callbackUrl);

    const popup = window.open(gateUrl.toString(), "kelo-pds-verification", "popup=yes,width=520,height=720");
    if (!popup) {
      setVerificationError(t("auth.signup.popupBlocked", "Votre navigateur a bloqué la fenêtre de vérification. Autorisez les fenêtres contextuelles pour Kelo Social puis réessayez."));
      return;
    }

    setVerifying(true);
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      setVerifying(false);
      setVerificationError(t("auth.signup.verificationExpired", "La vérification a expiré. Réessayez."));
      try { popup.close(); } catch {}
    }, 5 * 60 * 1000);

    async function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; code?: string; state?: string };
      if (data?.type !== "kelo-gatekeeper-verification") return;
      if (data.state !== state || !data.code) return;
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      setVerifying(false);
      try { popup.close(); } catch {}
      await completeSignupWithCode(data.code);
    }

    window.addEventListener("message", onMessage);
  };

  return (
    <AuthLayout title={t("auth.signup.title", "Inscription")} tagline={t("auth.signup.tagline", "Rejoignez le réseau social souverain et décentralisé.")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select label={t("auth.signup.pds", "Hébergé sur le PDS")} value={pdsUrl} onChange={(e) => setPdsUrl(e.target.value)}>
          {SIGNUP_PDS_PROVIDERS.map((provider) => <option key={provider.id} value={provider.url}>{provider.label}</option>)}
        </Select>

        <Input label={t("auth.signup.birthDate", "Date de naissance (18 ans minimum)")} type="date" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />

        <div>
          <Input label={t("auth.signup.handle", "Nom d'utilisateur (Handle)")} type="text" required startAdornment="@" placeholder={t("auth.signup.handlePlaceholder", "votre-nom")} value={handle} onChange={(e) => setHandle(e.target.value)} />
          <p className="mt-1 text-xs text-kelo-muted">{t("auth.signup.finalHandle", "Votre nom final sera @{handle}.kelosocial.eu", { handle: handle || t("auth.signup.handlePlaceholder", "votre-nom") })}</p>
        </div>

        <Input label={t("auth.signup.email", "Email")} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.signup.emailPlaceholder", "votre.email@exemple.com")} />

        <Input
          label={t("auth.signup.password", "Mot de passe")}
          type={showPassword ? "text" : "password"}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("auth.signup.passwordPlaceholder", "Votre mot de passe sécurisé")}
          endAdornment={<button type="button" onClick={() => setShowPassword(!showPassword)} className="text-sm font-medium text-kelo-muted transition-colors hover:text-kelo-secondary">{showPassword ? t("auth.signup.hidePassword", "Masquer") : t("auth.signup.showPassword", "Voir")}</button>}
        />

        <div className="rounded-2xl border border-kelo-border bg-kelo-background p-3 text-center text-xs text-kelo-muted">
          {t("auth.signup.captchaInfo", "En cliquant sur S'inscrire, le captcha sécurisé du PDS Kelo Social s'ouvrira. Une fois validé, la création du compte reprendra automatiquement.")}
        </div>

        {(error || verificationError) && <p className="text-center text-sm font-medium text-kelo-danger">{verificationError || error}</p>}

        <div className="mt-2 flex gap-4">
          <Link href="/login" className="flex w-1/2 items-center justify-center rounded-full bg-kelo-background py-3 text-center font-bold text-kelo-text transition-colors hover:bg-kelo-border/60">{t("auth.signup.alreadyAccount", "Déjà un compte ?")}</Link>
          <Button type="submit" loading={loading || verifying} loadingText={verifying ? t("auth.signup.verifying", "Vérification...") : t("auth.signup.creating", "Création...")} className="w-1/2">{t("auth.signup.submit", "S'inscrire")}</Button>
        </div>

        <div className="mt-2 flex justify-center"><Link href="/" className="text-sm text-kelo-muted transition-colors hover:text-kelo-text">{t("auth.signup.backHome", "Retour à l'accueil")}</Link></div>
      </form>
    </AuthLayout>
  );
}
