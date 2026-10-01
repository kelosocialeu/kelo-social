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
        <div className="h-7 w-7 rounded-full border-2 border-gray-200 border-t-violet-600" />
      </main>
    );
  }

  const features = [
    [t("landing.cards.algorithm.title", "Votre algorithme"), t("landing.cards.algorithm.text", "Choisissez le niveau d’algorithme qui vous convient depuis les paramètres.")],
    [t("landing.cards.identity.title", "Une identité vérifiable"), t("landing.cards.identity.text", "Kelo ID permet de distinguer différents types de comptes et de statuts.")],
    [t("landing.cards.federation.title", "AT Protocol"), t("landing.cards.federation.text", "Kelo Social s’appuie sur une architecture ouverte.")],
  ];

  return (
    <main className="min-h-screen bg-white text-gray-950">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="Kelo Social" className="shrink-0">
            <img src={LOGO} alt="Kelo Social" width={150} height={36} className="h-9 w-auto" />
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">{t("auth.login.submit", "Se connecter")}</Link>
            <Link href="/signup" className="rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">{t("auth.login.createAccount", "Créer un compte")}</Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:py-16">
          <p className="text-sm font-semibold text-violet-700">{t("landing.beta", "Kelo Social · Version bêta")}</p>
          <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {t("landing.hero.title", "Le réseau social qui vous laisse")}
            <span className="block text-violet-700">{t("landing.hero.emphasis", "reprendre le contrôle.")}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-6 text-gray-600">{t("landing.hero.description", "Une expérience sociale moderne construite sur AT Protocol, avec des choix d’algorithme et une architecture ouverte.")}</p>
          <div className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:max-w-none sm:flex-row sm:justify-center">
            <Link href="/signup" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-violet-700 px-5 font-bold text-white hover:bg-violet-800">{t("landing.hero.join", "Rejoindre Kelo Social")}</Link>
            <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 font-bold text-gray-800 hover:bg-gray-50">{t("landing.hero.existing", "J’ai déjà un compte")}</Link>
          </div>
          <p className="mt-5 text-xs text-gray-500">✓ {t("landing.hero.atproto", "Basé sur AT Protocol")} · ✓ {t("landing.hero.pds", "Plusieurs PDS")} · ✓ {t("landing.hero.verify", "Vérification avec Kelo ID")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-semibold text-violet-700">{t("landing.why.eyebrow", "Pourquoi Kelo Social ?")}</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{t("landing.why.title", "Une expérience simple et claire.")}</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">{t("landing.why.description", "Kelo Social vous donne davantage de choix tout en gardant une interface facile à comprendre.")}</p>
        </div>
        <div className="mt-7 grid gap-3 md:grid-cols-3">
          {features.map(([title, description]) => (
            <article key={title} className="rounded-xl border border-gray-200 p-5">
              <h3 className="text-base font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-100">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
          <div>
            <img src={LOGO} alt="Kelo Social" width={125} height={30} className="h-7 w-auto" loading="lazy" />
            <p className="mt-1 text-xs text-gray-500">{t("landing.footer.tagline", "Une expérience sociale construite autour d’AT Protocol.")}</p>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-gray-500">
            <Link href="/legal-notice">Mentions légales</Link>
            <Link href="/terms">{t("landing.footer.terms", "Conditions générales")}</Link>
            <Link href="/privacy">{t("landing.footer.privacy", "Confidentialité")}</Link>
            <Link href="/cookies">Cookies</Link>
            <Link href="/community-rules">{t("landing.footer.rules", "Règles et modération")}</Link>
          </nav>
          <div className="flex flex-wrap justify-between gap-2 border-t border-gray-100 pt-3 text-xs text-gray-400">
            <span>© 2026 Kelo Social</span><span>{locale} · {t("landing.betaShort", "Version bêta")}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}