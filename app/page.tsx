"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { useTranslation } from "@/components/providers/TranslationProvider";

const LOGO = "https://kelosocial.sirv.com/logo.png";

export default function LandingPage() {
  const router = useRouter();
  const { session, checked } = useAuthContext();
  const { t, locale } = useTranslation();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (checked && session) router.replace("/feed");
  }, [checked, session, router]);

  useEffect(() => {
    const saved = window.localStorage.getItem("kelo-landing-theme");
    setDark(saved === "dark");
  }, []);

  const toggleTheme = () => {
    setDark((current) => {
      const next = !current;
      window.localStorage.setItem("kelo-landing-theme", next ? "dark" : "light");
      return next;
    });
  };

  if (!checked || session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-7 w-7 rounded-full border-2 border-[#E1E3F2] border-t-violet-600" />
      </main>
    );
  }

  const features = [
    [t("landing.cards.algorithm.title", "Votre algorithme"), t("landing.cards.algorithm.text", "Choisissez le niveau d’algorithme qui vous convient depuis les paramètres.")],
    [t("landing.cards.identity.title", "Kelo ID"), t("landing.cards.identity.text", "Une identité vérifiable pour mieux distinguer les différents types de comptes.")],
    [t("landing.cards.federation.title", "AT Protocol"), t("landing.cards.federation.text", "Une technologie ouverte qui permet à différents services sociaux de communiquer.")],
  ];

  return (
    <main className={`min-h-screen transition-colors duration-300 ${dark ? "bg-gray-950 text-white" : "bg-white text-gray-950"}`}>
      <header className={`border-b transition-colors duration-300 ${dark ? "border-gray-800" : "border-[#E7E8F5]"}`}>
        <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="Kelo Social" className="shrink-0">
            <span className="inline-flex rounded-2xl p-1 transition-transform duration-200 hover:scale-105">
              <img src={LOGO} alt="Kelo Social" width={150} height={36} className="h-9 w-auto rounded-xl" />
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={dark ? "Activer le mode clair" : "Activer le mode sombre"}
              className={`group relative inline-flex h-9 w-16 items-center rounded-full border p-1 transition-all duration-300 ${dark ? "border-violet-500/40 bg-gray-800" : "border-violet-200 bg-violet-50"}`}
            >
              <span className={`absolute inset-y-1 left-1 flex w-7 items-center justify-center rounded-full bg-white text-xs shadow-sm transition-transform duration-300 ${dark ? "translate-x-7" : "translate-x-0"}`}>
                {dark ? "☀" : "☾"}
              </span>
              <span className={`ml-auto mr-1 text-[10px] font-bold ${dark ? "text-violet-300" : "text-violet-600"}`}>
                {dark ? "CLAIR" : "SOMBRE"}
              </span>
            </button>
            <Link href="/login" className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${dark ? "text-gray-200 hover:bg-gray-800" : "text-gray-700 hover:bg-gray-100"}`}>{t("auth.login.submit", "Se connecter")}</Link>
            <Link href="/signup" className="rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-[#6D5DFB] hover:-translate-y-0.5">{t("auth.login.createAccount", "Créer un compte")}</Link>
          </nav>
        </div>
      </header>

      <section className={`relative overflow-hidden border-b transition-colors duration-300 ${dark ? "border-gray-800 bg-[#111126]" : "border-gray-100 bg-[#F7F8FF]"}`}>
        <div className="pointer-events-none absolute -left-20 top-10 h-44 w-44 rounded-full bg-[#2563FF]/15 blur-3xl animate-[float_7s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-52 w-52 rounded-full bg-[#8B5CFF]/15 blur-3xl animate-[float_9s_ease-in-out_infinite_reverse]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-px w-40 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#6D5DFB]/30 to-transparent" />
        <div className="relative mx-auto max-w-3xl px-4 py-14 text-center sm:py-20">
          <div className="mx-auto mb-6 h-1 w-16 rounded-full bg-gradient-to-r from-[#2563FF] to-[#8B5CFF] animate-[pulseLine_2.5s_ease-in-out_infinite]" />
          <p className="animate-[fadeIn_0.5s_ease-out] text-sm font-semibold text-[#6D5DFB]">{t("landing.beta", "Kelo Social · Version bêta")}</p>
          <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {t("landing.hero.title", "Le réseau social qui vous laisse")}
            <span className="block bg-gradient-to-r from-[#2563FF] via-[#6D5DFB] to-[#8B5CFF] bg-clip-text text-transparent animate-[softGlow_4s_ease-in-out_infinite]">{t("landing.hero.emphasis", "reprendre le contrôle.")}</span>
          </h1>
          <p className={`mx-auto mt-4 max-w-xl text-base leading-6 ${dark ? "text-gray-300" : "text-gray-600"}`}>{t("landing.hero.description", "Une expérience sociale moderne construite sur AT Protocol, avec des choix d’algorithme et une architecture ouverte.")}</p>
          <div className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:max-w-none sm:flex-row sm:justify-center">
            <Link href="/signup" className="group inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">{t("landing.hero.join", "Rejoindre Kelo Social")} <span className="ml-2 transition-transform duration-200 group-hover:translate-x-1">→</span></Link>
            <Link href="/login" className={`inline-flex min-h-11 items-center justify-center rounded-lg border px-5 font-bold transition-all hover:-translate-y-0.5 ${dark ? "border-gray-700 bg-gray-950 text-gray-100 hover:bg-gray-800" : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"}`}>{t("landing.hero.existing", "J’ai déjà un compte")}</Link>
          </div>
          <p className={`mt-5 text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>✓ {t("landing.hero.atproto", "Basé sur AT Protocol")} · ✓ {t("landing.hero.pds", "Architecture ouverte")} · ✓ {t("landing.hero.verify", "Vérification avec Kelo ID")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-semibold text-[#6D5DFB]">{t("landing.why.eyebrow", "Pourquoi Kelo Social ?")}</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{t("landing.why.title", "Une expérience simple et claire.")}</h2>
          <p className={`mt-3 text-sm leading-6 ${dark ? "text-gray-300" : "text-gray-600"}`}>{t("landing.why.description", "Kelo Social est un réseau social simple où vous gardez davantage de contrôle sur votre expérience.")}</p>
        </div>
        <div className="relative mt-7 grid gap-3 md:grid-cols-3">
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-1/2 hidden h-px bg-gradient-to-r from-[#2563FF]/20 via-[#6D5DFB]/40 to-[#8B5CFF]/20 md:block" />
          {features.map(([title, description], index) => (
            <article key={title} className={`group relative z-10 rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${dark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"}`} style={{ animation: `fadeUp 0.45s ease-out ${index * 80}ms both` }}>
              <div className="mb-4 h-1 w-8 rounded-full bg-gradient-to-r from-[#2563FF] to-[#8B5CFF] transition-all duration-300 group-hover:w-12" />
              <h3 className="text-base font-bold">{title}</h3>
              <p className={`mt-2 text-sm leading-6 ${dark ? "text-gray-300" : "text-gray-600"}`}>{description}</p>
            </article>
          ))}
        </div>
      </section>

            <section className={`border-y transition-colors duration-300 ${dark ? "border-gray-800 bg-gray-900" : "border-gray-100 bg-gray-50"}`}>
        <div className="mx-auto max-w-3xl px-4 py-9 text-center">
          <p className="text-sm font-semibold text-[#6D5DFB]">{t("landing.about.eyebrow", "Kelo Social")}</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight">{t("landing.about.title", "Un réseau social pensé pour vous.")}</h2>
          <p className={`mx-auto mt-3 max-w-2xl text-sm leading-6 ${dark ? "text-gray-300" : "text-gray-600"}`}>
            {t("landing.about.description", "Kelo Social vous permet de publier, discuter et découvrir du contenu dans une interface claire. Vous pouvez choisir votre expérience algorithmique et utiliser Kelo ID pour la vérification.")}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="text-sm font-semibold text-[#6D5DFB]">{t("landing.atproto.eyebrow", "Technologie")}</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight">{t("landing.atproto.title", "AT Protocol, c’est quoi ?")}</h2>
        <p className={`mx-auto mt-2 max-w-2xl text-sm leading-6 ${dark ? "text-gray-300" : "text-gray-600"}`}>
          {t("landing.atproto.description", "Une technologie ouverte qui permet à différents services sociaux de communiquer entre eux et rend votre identité plus portable.")}
        </p>
      </section>

      <footer className={`border-t transition-colors duration-300 ${dark ? "border-gray-800" : "border-gray-100"}`}>
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
          <div>
            <img src={LOGO} alt="Kelo Social" width={125} height={30} className="h-7 w-auto rounded-lg" loading="lazy" />
            <p className={`mt-1 text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>{t("landing.footer.tagline", "Une expérience sociale construite autour d’AT Protocol.")}</p>
          </div>
          <nav className={`flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold ${dark ? "text-gray-400" : "text-gray-500"}`}>
            <Link href="/legal-notice">Mentions légales</Link>
            <Link href="/terms">{t("landing.footer.terms", "Conditions générales")}</Link>
            <Link href="/privacy">{t("landing.footer.privacy", "Confidentialité")}</Link>
            <Link href="/cookies">Cookies</Link>
            <Link href="/community-rules">{t("landing.footer.rules", "Règles et modération")}</Link>
          </nav>
          <div className={`flex flex-wrap justify-between gap-2 border-t pt-3 text-xs ${dark ? "border-gray-800 text-gray-500" : "border-gray-100 text-gray-400"}`}>
            <span>© 2026 Kelo Social</span><span>{locale} · {t("landing.betaShort", "Version bêta")}</span>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes pulseLine { 0%, 100% { transform: scaleX(.7); opacity: .55; } 50% { transform: scaleX(1.15); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(0, -10px, 0); } }
        @keyframes softGlow { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.08); } }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </main>
  );
}