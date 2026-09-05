"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import AuthLayout from "@/components/layout/AuthLayout";
import AuthSuccessAnimation from "@/components/auth/AuthSuccessAnimation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useSignup } from "@/hooks/useSignup";
import { useTranslation } from "@/components/providers/TranslationProvider";

const KELO_PDS = "https://pds.kelosocial.eu";
const GATE = (process.env.NEXT_PUBLIC_KELO_GATEKEEPER_URL || KELO_PDS).replace(/\/$/, "");
const TOTAL_STEPS = 3;

function getAge(date: string) {
  const birth = new Date(date);
  if (Number.isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const passed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!passed) age -= 1;
  return age;
}

function normalizeHandle(value: string) {
  return value
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/\.kelosocial\.eu$/i, "")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export default function SignupPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signup, loading, error } = useSignup();

  const finalHandle = `${handle || "votre-nom"}.kelosocial.eu`;
  const age = useMemo(() => getAge(birthDate), [birthDate]);

  const stepOneValid = Boolean(email.trim()) && Boolean(birthDate) && age >= 18;
  const stepTwoValid = handle.length >= 3 && password.length >= 8;

  const complete = async (code: string) => {
    const ok = await signup(
      {
        handle,
        email,
        password,
        birthDate,
        pdsUrl: KELO_PDS,
        verificationCode: code,
      },
      { redirect: false }
    );
    if (ok) setSuccess(true);
  };

  const createAccount = async () => {
    setVerificationError("");
    const full = `${handle}.kelosocial.eu`;
    const state = crypto.randomUUID();
    const callback = `${window.location.origin}/signup/gate-callback`;
    const gate = new URL(`${GATE}/gate/signup`);
    gate.searchParams.set("handle", full);
    gate.searchParams.set("state", state);
    gate.searchParams.set("redirect_url", callback);

    const popup = window.open(
      gate.toString(),
      "kelo-pds-verification",
      "popup=yes,width=520,height=720"
    );

    if (!popup) {
      setVerificationError("Votre navigateur a bloqué la fenêtre de vérification.");
      return;
    }

    setVerifying(true);

    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      setVerifying(false);
      setVerificationError("La vérification a expiré. Veuillez recommencer.");
      try { popup.close(); } catch {}
    }, 300000);

    async function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; code?: string; state?: string };
      if (
        data?.type !== "kelo-gatekeeper-verification" ||
        data.state !== state ||
        !data.code
      ) return;

      clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      setVerifying(false);
      try { popup.close(); } catch {}
      await complete(data.code);
    }

    window.addEventListener("message", onMessage);
  };

  const nextStep = () => {
    setVerificationError("");
    if (step === 1 && !stepOneValid) return;
    if (step === 2 && !stepTwoValid) return;
    setStep((current) => Math.min(TOTAL_STEPS, current + 1));
  };

  if (success) {
    return (
      <AuthSuccessAnimation
        title={t("auth.signup.successTitle", "Compte créé !")}
        message="Bienvenue sur Kelo Social. Vous bénéficiez de 2 jours d’essai avant que la vérification Kelo ID soit requise."
        duration={2600}
        onDone={() => window.location.replace("/login")}
      />
    );
  }

  return (
    <AuthLayout
      title={t("auth.signup.title", "Créer votre compte")}
      tagline="Quelques étapes suffisent pour rejoindre Kelo Social."
    >
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-kelo-muted">
          <span>Étape {step} sur {TOTAL_STEPS}</span>
          <span>{Math.round((step / TOTAL_STEPS) * 100)} %</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-kelo-background">
          <div
            className="h-full rounded-full bg-kelo-gradient transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-kelo-text">Commençons par vous</h2>
            <p className="mt-1 text-sm text-kelo-muted">
              Ces informations servent à créer votre compte Kelo Social.
            </p>
          </div>

          <Input
            label="Adresse e-mail"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="vous@exemple.com"
          />

          <Input
            label="Date de naissance (18 ans minimum)"
            type="date"
            required
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />

          {birthDate && age < 18 && (
            <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-medium text-kelo-danger">
              Vous devez avoir 18 ans ou plus pour créer un compte Kelo Social.
            </p>
          )}

          <button
            type="button"
            disabled={!stepOneValid}
            onClick={nextStep}
            className="mt-2 rounded-full bg-kelo-gradient px-5 py-3 font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-kelo-text">Choisissez votre identité</h2>
            <p className="mt-1 text-sm text-kelo-muted">
              Votre identifiant fonctionne sur AT Protocol et reste lié à votre compte.
            </p>
          </div>

          <div>
            <Input
              label="Nom d'utilisateur"
              type="text"
              required
              startAdornment="@"
              value={handle}
              onChange={(event) => setHandle(normalizeHandle(event.target.value))}
              placeholder="matteo"
            />
            <div className="mt-2 rounded-2xl border border-kelo-border bg-kelo-background px-3 py-2 text-sm">
              Votre adresse sera <strong>@{finalHandle}</strong>
            </div>
          </div>

          <Input
            label="Mot de passe"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            endAdornment={
              <button type="button" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? "Masquer" : "Voir"}
              </button>
            }
          />
          <p className="-mt-2 text-xs text-kelo-muted">8 caractères minimum.</p>

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-1/3 rounded-full bg-kelo-background px-4 py-3 font-bold text-kelo-text"
            >
              Retour
            </button>
            <button
              type="button"
              disabled={!stepTwoValid}
              onClick={nextStep}
              className="w-2/3 rounded-full bg-kelo-gradient px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-kelo-text">Votre compte est presque prêt</h2>
            <p className="mt-1 text-sm text-kelo-muted">
              Vérifiez les informations puis terminez la création du compte.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-kelo-border bg-kelo-background p-4 text-sm">
            <div className="flex justify-between gap-4"><span className="text-kelo-muted">Compte</span><strong className="text-right">@{finalHandle}</strong></div>
            <div className="flex justify-between gap-4"><span className="text-kelo-muted">E-mail</span><strong className="truncate text-right">{email}</strong></div>
            <div className="flex justify-between gap-4"><span className="text-kelo-muted">Hébergement</span><strong>Kelo Social PDS</strong></div>
          </div>

          <div className="rounded-2xl border border-kelo-primary/30 bg-kelo-primary/5 p-4">
            <p className="font-extrabold text-kelo-text">🎁 2 jours d’essai</p>
            <p className="mt-1 text-sm text-kelo-muted">
              Après la création du compte, vous pouvez utiliser les fonctions protégées pendant 48 heures sans Kelo ID. Une fois l’essai terminé, la vérification Kelo ID devient nécessaire pour continuer ces actions.
            </p>
          </div>

          <div className="rounded-2xl border border-kelo-border bg-white p-3 text-center text-xs text-kelo-muted">
            En créant votre compte, la vérification anti-robot sécurisée du PDS Kelo Social s’ouvrira.
          </div>

          {(error || verificationError) && (
            <p className="text-center text-sm font-medium text-kelo-danger">
              {verificationError || error}
            </p>
          )}

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={loading || verifying}
              className="w-1/3 rounded-full bg-kelo-background px-4 py-3 font-bold text-kelo-text disabled:opacity-50"
            >
              Retour
            </button>
            <Button
              type="button"
              loading={loading || verifying}
              onClick={createAccount}
              className="w-2/3"
            >
              Créer mon compte
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-kelo-border pt-4 text-center text-sm text-kelo-muted">
        Vous avez déjà un compte ?{" "}
        <Link href="/login" className="font-bold text-kelo-primary hover:underline">
          Se connecter
        </Link>
      </div>
    </AuthLayout>
  );
}
