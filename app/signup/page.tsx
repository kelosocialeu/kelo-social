"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/layout/AuthLayout";
import { useTranslation } from "@/components/providers/TranslationProvider";
import { startKeloPdsSignup } from "@/lib/atproto/oauth-signup";

function getAge(date: string) {
  const birth = new Date(date);
  if (Number.isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age -= 1;
  return age;
}

export default function SignupPage() {
  const { t } = useTranslation();
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const age = useMemo(() => getAge(birthDate), [birthDate]);
  const valid = Boolean(birthDate) && age >= 18;

  const createAccount = async () => {
    if (!valid) return;
    setLoading(true);
    setError("");

    try {
      await startKeloPdsSignup();
    } catch (err) {
      console.error("Kelo PDS OAuth signup failed:", err);
      setLoading(false);
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d’ouvrir la création de compte Kelo PDS."
      );
    }
  };

  return (
    <AuthLayout
      title={t("auth.signup.title", "Créer votre compte")}
      tagline="La création du compte est maintenant effectuée directement par le PDS Kelo Social via AT Protocol OAuth."
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-3xl border border-violet-100 bg-violet-50/70 p-5">
          <p className="font-extrabold text-kelo-text">🔐 Création sécurisée sur le PDS Kelo Social</p>
          <p className="mt-2 text-sm leading-6 text-kelo-muted">
            En continuant, vous serez redirigé vers <strong>pds.kelosocial.eu</strong>.
            Le PDS réalise lui-même la création du compte, le choix de votre handle,
            le mot de passe, l’e-mail et les contrôles anti-abus. Kelo Social ne
            récupère pas votre mot de passe.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-kelo-text">
            Date de naissance (18 ans minimum)
          </label>
          <input
            type="date"
            required
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className="w-full rounded-2xl border border-kelo-border bg-white px-4 py-3.5 text-kelo-text outline-none focus:border-kelo-primary focus:ring-2 focus:ring-kelo-primary/15"
          />
        </div>

        {birthDate && age < 18 && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-kelo-danger">
            Vous devez avoir 18 ans ou plus pour créer un compte Kelo Social.
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-kelo-danger">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={!valid || loading}
          onClick={createAccount}
          className="w-full rounded-full bg-kelo-gradient px-5 py-4 font-extrabold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Ouverture du PDS…" : "Créer mon compte sur Kelo PDS"}
        </button>

        <div className="rounded-2xl border border-kelo-border bg-kelo-background p-4 text-center text-xs leading-5 text-kelo-muted">
          Après la création, vous reviendrez automatiquement sur Kelo Social.
          La <strong>connexion reste inchangée</strong> : e-mail ou handle + mot de passe.
        </div>
      </div>

      <div className="mt-6 border-t border-kelo-border pt-4 text-center text-sm text-kelo-muted">
        Vous avez déjà un compte ?{" "}
        <Link href="/login" className="font-bold text-kelo-primary hover:underline">
          Se connecter
        </Link>
      </div>
    </AuthLayout>
  );
}
