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
    [t("landing.cards.algorithm.title", "Votre algorithme"), t("landing.cards.algorithm.text", "Choisissez le niveau d’algorithme qui vous convient dans les paramètres.")],
    [t("landing.cards.identity.title", "Kelo ID"), t("landing.cards.identity.text", "Une identité vérifiable pour mieux distinguer les différents types de comptes.")],
    [t("landing.cards.federation.title", "AT Protocol"), t("landing.cards.federation.text", "Une technologie ouverte qui permet à différents services sociaux de communiquer entre eux.")],
  ];

  return (
    <main className={`relative min-h-screen overflow-hidden transition-colors duration-300 ${dark ? "bg-[#09091A] text-white" : "bg-[#F8F9FF] text-gray-950"}`}>
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden"><div className="absolute -left-32 top-24 h-80 w-80 rounded-full bg-[#2563FF]/10 blur-3xl animate-[float_10s_ease-in-out_infinite]" /><div className="absolute right-[-10rem] top-1/3 h-96 w-96 rounded-full bg-[#8B5CFF]/10 blur-3xl animate-[float_12s_ease-in-out_infinite_reverse]" /><div className="absolute left-1/3 bottom-[-10rem] h-80 w-80 rounded-full bg-[#EC4899]/8 blur-3xl animate-[float_14s_ease-in-out_infinite]" /></div>
      <header className={`border-b backdrop-blur-xl transition-colors duration-300 ${dark ? "border-white/10 bg-[#09091A]/80" : "border-white/70 bg-white/75 shadow-sm"}`}>
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
            <Link href="/signup" className="rounded-xl bg-gradient-to-r from-[#2563FF] via-[#6D5DFB] to-[#8B5CFF] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">{t("auth.login.createAccount", "Créer un compte")}</Link>
          </nav>
        </div>
      </header>

      <section className={`relative overflow-hidden border-b transition-colors duration-300 ${dark ? "border-white/10 bg-[#070714]" : "border-[#E5E7F7] bg-[#F7F8FF]"}`}>
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${dark ? "bg-[#6D5DFB]/10" : "bg-[#6D5DFB]/12"}`} />
          <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#2563FF]/15 blur-3xl animate-[float_8s_ease-in-out_infinite]" />
          <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[#EC4899]/15 blur-3xl animate-[float_10s_ease-in-out_infinite_reverse]" />
          <div className="absolute left-[12%] top-[24%] h-2 w-2 rounded-full bg-[#22D3EE] shadow-[0_0_24px_#22D3EE] animate-[orbit_5s_ease-in-out_infinite]" />
          <div className="absolute right-[16%] top-[30%] h-2.5 w-2.5 rounded-full bg-[#EC4899] shadow-[0_0_24px_#EC4899] animate-[orbit_6s_ease-in-out_infinite_reverse]" />
          <div className="absolute bottom-[20%] left-[20%] h-2 w-2 rounded-full bg-[#F59E0B] shadow-[0_0_20px_#F59E0B] animate-[orbit_7s_ease-in-out_infinite]" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_.95fr] lg:gap-8">
          <div className="relative z-10 text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#8B5CFF]/20 bg-white/70 px-3 py-1.5 text-xs font-bold text-[#6D5DFB] shadow-sm backdrop-blur dark:bg-white/5">
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#2563FF] to-[#EC4899] animate-pulse" />
              {t("landing.beta", "Kelo Social · Version bêta")}
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-[5.25rem]">
              {t("landing.hero.title", "Le réseau social qui vous permet de")}
              <span className="mt-2 block bg-gradient-to-r from-[#2563FF] via-[#6D5DFB] to-[#EC4899] bg-clip-text pb-2 text-transparent">{t("landing.hero.emphasis", "reprendre le contrôle de votre expérience.")}</span>
            </h1>

            <p className={`mx-auto mt-6 max-w-xl text-base leading-7 lg:mx-0 ${dark ? "text-gray-300" : "text-gray-600"}`}>
              {t("landing.hero.description", "Une expérience sociale moderne construite avec l’AT Protocol, avec des choix d’algorithme et une architecture ouverte.")}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/signup" className="group inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[#2563FF] via-[#6D5DFB] to-[#8B5CFF] px-6 font-bold text-white shadow-[0_12px_35px_rgba(109,93,251,.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(109,93,251,.35)]">
                {t("landing.hero.join", "Rejoindre Kelo Social")} <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link href="/login" className={`inline-flex min-h-12 items-center justify-center rounded-2xl border px-6 font-bold backdrop-blur transition-all duration-300 hover:-translate-y-1 ${dark ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : "border-[#D9DCF0] bg-white/80 text-gray-800 hover:bg-white"}`}>
                {t("landing.hero.existing", "J’ai déjà un compte")}
              </Link>
            </div>

            <div className={`mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-medium lg:justify-start ${dark ? "text-gray-400" : "text-gray-500"}`}>
              <span>✓ {t("landing.hero.atproto", "Basé sur AT Protocol")}</span>
              <span>✓ {t("landing.hero.pds", "Architecture ouverte")}</span>
              <span>✓ {t("landing.hero.verify", "Kelo ID")}</span>
            </div>
          </div>

          <div className="relative mx-auto h-[360px] w-full max-w-[470px] sm:h-[430px]" aria-hidden="true">
            <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-[#2563FF]/10 via-[#8B5CFF]/10 to-[#EC4899]/10 blur-2xl" />
            <div className={`absolute inset-[8%] rounded-[2.5rem] border backdrop-blur-xl shadow-2xl ${dark ? "border-white/10 bg-[#101022]/80 shadow-black/30" : "border-white/80 bg-white/70 shadow-[#6D5DFB]/10"}`}>
              <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#2563FF] via-[#6D5DFB] to-[#EC4899] p-[3px] shadow-[0_0_55px_rgba(109,93,251,.35)] animate-[softGlow_4s_ease-in-out_infinite]">
                <div className="flex h-full w-full items-center justify-center rounded-[1.85rem] bg-white/95 p-3">
                  <img src={LOGO} alt="" width={110} height={36} className="h-auto w-full object-contain" />
                </div>
              </div>

              <div className="absolute left-[12%] top-[17%] flex h-14 w-14 items-center justify-center rounded-2xl border border-[#22D3EE]/30 bg-[#22D3EE]/10 text-xl shadow-lg animate-[float_4.5s_ease-in-out_infinite]">✦</div>
              <div className="absolute right-[12%] top-[20%] flex h-14 w-14 items-center justify-center rounded-2xl border border-[#EC4899]/30 bg-[#EC4899]/10 text-xl shadow-lg animate-[float_5.5s_ease-in-out_infinite_reverse]">♡</div>
              <div className="absolute bottom-[17%] left-[15%] flex h-14 w-14 items-center justify-center rounded-2xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-xl shadow-lg animate-[float_6s_ease-in-out_infinite_reverse]">◎</div>
              <div className="absolute bottom-[14%] right-[15%] flex h-14 w-14 items-center justify-center rounded-2xl border border-[#8B5CFF]/30 bg-[#8B5CFF]/10 text-xl shadow-lg animate-[float_5s_ease-in-out_infinite]">⌁</div>

              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" fill="none">
                <path d="M27 28 L50 50 L73 30 M50 50 L30 72 M50 50 L72 74" stroke="url(#keloLine)" strokeWidth="0.65" strokeDasharray="2 2" opacity=".55" />
                <defs><linearGradient id="keloLine" x1="20" y1="20" x2="80" y2="80"><stop stopColor="#22D3EE"/><stop offset=".5" stopColor="#6D5DFB"/><stop offset="1" stopColor="#EC4899"/></linearGradient></defs>
              </svg>

              <div className={`absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-wide ${dark ? "border-white/10 bg-black/20 text-gray-300" : "border-[#E5E7F7] bg-white/80 text-gray-500"}`}>AT PROTOCOL · KELO ID · KELO SOCIAL</div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 grid items-end gap-5 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#6D5DFB]">{t("landing.why.eyebrow", "Pourquoi Kelo Social ?")}</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">{t("landing.why.title", "Une expérience sociale qui vous ressemble.")}</h2>
            </div>
            <p className={`max-w-md text-sm leading-6 lg:text-right ${dark ? "text-gray-400" : "text-gray-600"}`}>{t("landing.why.description", "Kelo Social vous donne les outils pour personnaliser votre expérience sociale et garder davantage de contrôle.")}</p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {features.map(([title, description], index) => (
              <article key={title} className={`group relative min-h-56 overflow-hidden rounded-[2rem] border p-7 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${dark ? "border-white/10 bg-white/[0.04]" : "border-[#E4E6F5] bg-white shadow-[0_15px_50px_rgba(38,42,90,.07)]"}`} style={{ animation: `fadeUp 0.5s ease-out ${index * 100}ms both` }}>
                <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl transition-transform duration-500 group-hover:scale-150 ${index === 0 ? "bg-[#2563FF]/20" : index === 1 ? "bg-[#EC4899]/20" : "bg-[#8B5CFF]/20"}`} />
                <div className="relative">
                  <div className="mb-7 flex items-center justify-between">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black text-white shadow-lg ${index === 0 ? "bg-gradient-to-br from-[#2563FF] to-[#22D3EE]" : index === 1 ? "bg-gradient-to-br from-[#EC4899] to-[#F59E0B]" : "bg-gradient-to-br from-[#6D5DFB] to-[#8B5CFF]"}`}>
                      {index === 0 ? "✦" : index === 1 ? "✓" : "∞"}
                    </span>
                    <span className={`text-4xl font-black transition-transform duration-500 group-hover:scale-110 ${dark ? "text-white/10" : "text-[#6D5DFB]/10"}`}>0{index + 1}</span>
                  </div>
                  <h3 className="text-xl font-black">{title}</h3>
                  <p className={`mt-3 text-sm leading-6 ${dark ? "text-gray-300" : "text-gray-600"}`}>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`relative overflow-hidden px-4 py-20 sm:py-24 ${dark ? "bg-[#0D0D22]" : "bg-white"}`}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8B5CFF]/40 to-transparent" />
        <div className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-[#2563FF]/10 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#6D5DFB]">{t("landing.about.eyebrow", "Kelo Social")}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{t("landing.about.title", "Un réseau social pensé pour vous.")}</h2>
          </div>
          <div className={`rounded-[2rem] border p-7 sm:p-9 ${dark ? "border-white/10 bg-white/[0.04]" : "border-[#E6E8F5] bg-[#F8F9FF]"}`}>
            <div className="mb-5 h-1.5 w-20 rounded-full bg-gradient-to-r from-[#2563FF] via-[#6D5DFB] to-[#EC4899]" />
            <p className={`text-base leading-8 ${dark ? "text-gray-300" : "text-gray-600"}`}>
              {t("landing.about.description", "Publiez, échangez et découvrez du contenu dans un espace pensé pour être simple, vivant et personnalisable. Choisissez votre expérience algorithmique et utilisez Kelo ID lorsque vous souhaitez vérifier votre identité.")}
            </p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-[#8B5CFF]/20 bg-gradient-to-br from-[#2563FF] via-[#6D5DFB] to-[#EC4899] p-[1px] shadow-[0_25px_80px_rgba(109,93,251,.18)]">
          <div className={`relative overflow-hidden rounded-[2.45rem] px-6 py-12 sm:px-12 sm:py-16 ${dark ? "bg-[#0C0C1D]" : "bg-white"}`}>
            <div className="absolute right-[-80px] top-[-100px] h-64 w-64 rounded-full bg-[#8B5CFF]/10 blur-3xl" />
            <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_.8fr]">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#6D5DFB]">{t("landing.atproto.eyebrow", "Technologie")}</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{t("landing.atproto.title", "AT Protocol, c’est quoi ?")}</h2>
                <p className={`mt-5 max-w-2xl text-base leading-7 ${dark ? "text-gray-300" : "text-gray-600"}`}>
                  {t("landing.atproto.description", "AT Protocol est une technologie ouverte qui permet à différents services sociaux de communiquer entre eux. Votre identité et vos données sont ainsi pensées pour être plus portables entre les services compatibles.")}
                </p>
              </div>
              <div className="relative mx-auto h-48 w-48">
                <div className="absolute inset-0 rounded-full border border-[#22D3EE]/30 animate-[spinSlow_12s_linear_infinite]" />
                <div className="absolute inset-6 rounded-full border border-[#EC4899]/30 animate-[spinSlow_9s_linear_infinite_reverse]" />
                <div className="absolute inset-12 flex items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-[#2563FF] via-[#6D5DFB] to-[#EC4899] p-1 shadow-[0_0_45px_rgba(109,93,251,.3)]">
                  <div className="flex h-full w-full items-center justify-center rounded-[1.5rem] bg-white p-4"><img src={LOGO} alt="" width={120} height={40} className="w-full object-contain" /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`overflow-hidden border-y py-5 ${dark ? "border-white/10 bg-white/[0.03]" : "border-[#E8EAF5] bg-white"}`}>
        <div className={`flex min-w-max animate-[marquee_22s_linear_infinite] gap-10 text-xs font-bold uppercase tracking-[0.2em] ${dark ? "text-gray-500" : "text-gray-400"}`}>
          <span>KELO SOCIAL</span><span>✦</span><span>KELO ID</span><span>✦</span><span>AT PROTOCOL</span><span>✦</span><span>RÉSEAU SOCIAL OUVERT</span><span>✦</span><span>KELO SOCIAL</span><span>✦</span><span>KELO ID</span><span>✦</span><span>AT PROTOCOL</span>
        </div>
      </section>

      <footer className={`border-t transition-colors duration-300 ${dark ? "border-gray-800" : "border-gray-100"}`}>
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
          <div>
            <img src={LOGO} alt="Kelo Social" width={125} height={30} className="h-7 w-auto rounded-lg" loading="lazy" />
            <p className={`mt-1 text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>{t("landing.footer.tagline", "Un réseau social ouvert, coloré et construit autour d’AT Protocol.")}</p>
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
        @keyframes spinSlow { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes orbit { 0%, 100% { transform: translate3d(0, 0, 0) scale(1); } 50% { transform: translate3d(14px, -12px, 0) scale(1.25); } }
        @keyframes pulseLine { 0%, 100% { transform: scaleX(.7); opacity: .55; } 50% { transform: scaleX(1.15); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(0, -10px, 0); } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-35%); } }\n        @keyframes softGlow { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.08); } }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </main>
  );
}