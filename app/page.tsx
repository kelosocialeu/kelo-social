"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { useTranslation } from "@/components/providers/TranslationProvider";

const LOGO = "https://kelosocial.sirv.com/logo.png";

export default function LandingPage() {
  const router = useRouter();
  const { session, checked } = useAuthContext();
  const { t, locale } = useTranslation();

  useEffect(() => {
    if (checked && session) router.replace("/feed");
  }, [checked, session, router]);

  if (!checked || session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-violet-600" />
      </main>
    );
  }

  const features = [
    [
      "🧠",
      t("landing.cards.algorithm.title", "Votre algorithme"),
      t(
        "landing.cards.algorithm.text",
        "Choisissez le niveau d’algorithme qui vous convient depuis les paramètres."
      ),
    ],
    [
      "🪪",
      t("landing.cards.identity.title", "Une identité vérifiable"),
      t(
        "landing.cards.identity.text",
        "Kelo ID permet de distinguer différents types de comptes et de statuts."
      ),
    ],
    [
      "🌐",
      t("landing.cards.federation.title", "AT Protocol"),
      t(
        "landing.cards.federation.text",
        "Kelo Social s’appuie sur une architecture ouverte et fédérée."
      ),
    ],
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-gray-950">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Kelo Social" className="shrink-0">
            <img
              src={LOGO}
              alt="Kelo Social"
              className="h-9 w-auto max-w-[170px] object-contain"
            />
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              {t("auth.login.submit", "Se connecter")}
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              {t("auth.login.createAccount", "Créer un compte")}
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto w-full max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:py-24">
          <p className="text-sm font-semibold text-violet-700">
            {t("landing.beta", "Kelo Social · Version bêta")}
          </p>

          <h1 className="mx-auto mt-4 max-w-3xl break-words text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            {t("landing.hero.title", "Le réseau social qui vous laisse")}
            <span className="block text-violet-700">
              {t("landing.hero.emphasis", "reprendre le contrôle.")}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl break-words text-base leading-7 text-gray-600 sm:text-lg">
            {t(
              "landing.hero.description",
              "Une expérience sociale moderne construite sur AT Protocol, avec des choix d’algorithme et une architecture ouverte."
            )}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-violet-700 px-6 font-bold text-white hover:bg-violet-800"
            >
              {t("landing.hero.join", "Rejoindre Kelo Social")}
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-gray-300 bg-white px-6 font-bold text-gray-800 hover:bg-gray-50"
            >
              {t("landing.hero.existing", "J’ai déjà un compte")}
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            <span>✓ {t("landing.hero.atproto", "Basé sur AT Protocol")}</span>
            <span>✓ {t("landing.hero.pds", "Plusieurs PDS")}</span>
            <span>✓ {t("landing.hero.verify", "Vérification avec Kelo ID")}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-18">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-violet-700">
            {t("landing.why.eyebrow", "Pourquoi Kelo Social ?")}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("landing.why.title", "Une expérience simple et claire.")}
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600">
            {t(
              "landing.why.description",
              "Kelo Social vous donne davantage de choix tout en gardant une interface facile à comprendre."
            )}
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {features.map(([icon, title, description]) => (
            <article
              key={title}
              className="min-w-0 rounded-2xl border border-gray-200 bg-white p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-xl">
                {icon}
              </div>
              <h3 className="mt-5 break-words text-lg font-bold">{title}</h3>
              <p className="mt-2 break-words text-sm leading-6 text-gray-600">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-gray-100 bg-gray-50">
        <div className="mx-auto w-full max-w-4xl px-4 py-14 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("landing.cta.title", "Votre prochain fil peut commencer ici.")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600">
            {t(
              "landing.cta.text",
              "Créez votre compte et découvrez Kelo Social."
            )}
          </p>
          <Link
            href="/signup"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-lg bg-gray-950 px-7 font-bold text-white hover:bg-violet-700"
          >
            {t("auth.login.createAccount", "Créer un compte")}
          </Link>
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <img
              src={LOGO}
              alt="Kelo Social"
              className="h-8 w-auto max-w-[150px] object-contain"
            />
            <p className="mt-2 max-w-md text-xs leading-5 text-gray-500">
              {t(
                "landing.footer.tagline",
                "Une expérience sociale construite autour d’AT Protocol."
              )}
            </p>
          </div>

          <nav className="flex max-w-xl flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-gray-500">
            <Link href="/legal-notice" className="hover:text-violet-700">
              {t("landing.footer.legal", "Mentions légales")}
            </Link>
            <Link href="/terms" className="hover:text-violet-700">
              {t("landing.footer.terms", "Conditions générales")}
            </Link>
            <Link href="/privacy" className="hover:text-violet-700">
              {t("landing.footer.privacy", "Confidentialité")}
            </Link>
            <Link href="/cookies" className="hover:text-violet-700">
              Cookies
            </Link>
            <Link href="/community-rules" className="hover:text-violet-700">
              {t("landing.footer.rules", "Règles et modération")}
            </Link>
          </nav>
        </div>

        <div className="border-t border-gray-100">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-gray-400 sm:px-6 sm:flex-row sm:justify-between">
            <span>© 2026 Kelo Social</span>
            <span>{locale} · {t("landing.betaShort", "Version bêta")}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
