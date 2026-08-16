"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";

const LOGO = "https://kelosocial.sirv.com/logo.png";

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-xl text-violet-700">
      {children}
    </span>
  );
}

function SocialPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="absolute -left-8 top-16 h-40 w-40 rounded-full bg-violet-300/35 blur-3xl" />
      <div className="absolute -right-12 bottom-16 h-48 w-48 rounded-full bg-fuchsia-300/30 blur-3xl" />

      <div className="relative overflow-hidden rounded-[34px] border border-white/70 bg-white/90 shadow-[0_35px_100px_rgba(91,55,180,0.22)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="" className="h-9 w-9 object-contain" />
            <div>
              <p className="text-sm font-black text-gray-900">Kelo Social</p>
              <p className="text-xs text-gray-500">Votre fil</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-pink-300" />
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <article className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 font-black text-white">K</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-extrabold text-gray-900">Kelo Social</span>
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-violet-600 text-[10px] font-black text-white">✓</span>
                  <span className="text-xs text-gray-400">@kelosocial.eu · maintenant</span>
                </div>
                <p className="mt-3 text-[15px] leading-6 text-gray-700">
                  Un réseau social qui vous laisse le choix : votre identité, votre algorithme, votre expérience. ✨
                </p>
                <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 p-[1px]">
                  <div className="rounded-[15px] bg-gray-950 px-5 py-8 text-center text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-200">AT Protocol</p>
                    <p className="mt-2 text-2xl font-black">Ouvert. Fédéré. À votre façon.</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
                  <span>♡ 248</span><span>◌ 37</span><span>↗ 61</span><span>⋯</span>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-pink-100 text-lg">🌍</div>
              <div className="flex-1">
                <div className="h-3 w-28 rounded-full bg-gray-200" />
                <div className="mt-2 h-2.5 w-44 rounded-full bg-gray-100" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-2.5 w-full rounded-full bg-gray-100" />
              <div className="h-2.5 w-5/6 rounded-full bg-gray-100" />
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { session, checked } = useAuthContext();

  useEffect(() => {
    if (checked && session) router.replace("/feed");
  }, [checked, session, router]);

  if (!checked || session) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-violet-50 via-white to-fuchsia-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfaff] text-gray-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[760px] bg-[radial-gradient(circle_at_10%_10%,rgba(124,58,237,0.16),transparent_34%),radial-gradient(circle_at_90%_16%,rgba(217,70,239,0.13),transparent_32%),linear-gradient(to_bottom,#ffffff,#fbfaff)]" />

      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <img src={LOGO} alt="Kelo Social" className="h-11 w-auto object-contain sm:h-12" />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="rounded-full px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-white hover:text-violet-700 sm:px-5">
            Se connecter
          </Link>
          <Link href="/signup" className="rounded-full bg-gray-950 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-gray-300/60 transition hover:-translate-y-0.5 hover:bg-violet-700 sm:px-5">
            Créer un compte
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.02fr_.98fr] lg:px-10 lg:pb-28 lg:pt-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-extrabold text-violet-700 shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-violet-600" />
            Kelo Social · Version bêta
          </div>

          <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.96] tracking-[-0.055em] sm:text-6xl lg:text-7xl xl:text-[5.2rem]">
            Le réseau social qui vous laisse
            <span className="block bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">reprendre le contrôle.</span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl">
            Une expérience sociale moderne construite sur <strong className="font-extrabold text-gray-900">AT Protocol</strong>, avec une identité vérifiable, des choix d’algorithme et une architecture ouverte à plusieurs PDS.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex min-h-14 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 px-7 text-base font-black text-white shadow-xl shadow-violet-300/40 transition hover:-translate-y-1 hover:shadow-2xl">
              Rejoindre Kelo Social
            </Link>
            <Link href="/login" className="inline-flex min-h-14 items-center justify-center rounded-full border border-gray-200 bg-white px-7 text-base font-black text-gray-800 shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:text-violet-700 hover:shadow-lg">
              J’ai déjà un compte
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-gray-500">
            <span>✓ Basé sur AT Protocol</span>
            <span>✓ Plusieurs PDS</span>
            <span>✓ Vérification avec Kelo ID</span>
          </div>
        </div>

        <SocialPreview />
      </section>

      <section className="relative z-10 border-y border-violet-100/80 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-5 sm:px-8 lg:grid-cols-4 lg:px-10">
          {[
            ["AT Protocol", "Une base ouverte et fédérée"],
            ["Kelo ID", "Une vérification pensée séparément"],
            ["Algorithmes", "Vous choisissez le niveau souhaité"],
            ["PDS", "Connectez-vous avec plusieurs fournisseurs"],
          ].map(([title, text]) => (
            <div key={title} className="px-3 py-7 text-center sm:px-6 lg:py-9">
              <p className="text-base font-black text-gray-900">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-violet-600">Pourquoi Kelo Social ?</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-gray-950 sm:text-5xl">Une autre façon de penser le réseau social.</h2>
          <p className="mt-5 text-lg leading-8 text-gray-600">Kelo Social ne cherche pas simplement à refaire une interface connue. Le projet part des problèmes rencontrés par les utilisateurs et tente de leur redonner davantage de choix.</p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-[0_15px_50px_rgba(46,32,90,0.08)]">
            <Icon>🧠</Icon><h3 className="mt-6 text-xl font-black">Votre algorithme</h3><p className="mt-3 leading-7 text-gray-600">Ajustez l’intensité de votre algorithme depuis les paramètres au lieu de subir un choix unique.</p>
          </div>
          <div className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-[0_15px_50px_rgba(46,32,90,0.08)]">
            <Icon>🪪</Icon><h3 className="mt-6 text-xl font-black">Une identité vérifiable</h3><p className="mt-3 leading-7 text-gray-600">Kelo ID permet de distinguer les personnes et différents types d’organisations avec des statuts adaptés.</p>
          </div>
          <div className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-[0_15px_50px_rgba(46,32,90,0.08)]">
            <Icon>🌐</Icon><h3 className="mt-6 text-xl font-black">Ouvert à la fédération</h3><p className="mt-3 leading-7 text-gray-600">Kelo Social s’inscrit dans l’écosystème AT Protocol et peut fonctionner avec plusieurs PDS compatibles.</p>
          </div>
          <div className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-[0_15px_50px_rgba(46,32,90,0.08)]">
            <Icon>✨</Icon><h3 className="mt-6 text-xl font-black">Une expérience moderne</h3><p className="mt-3 leading-7 text-gray-600">Une interface pensée pour rester claire, agréable et cohérente sur ordinateur, tablette et mobile.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8 lg:px-10 lg:pb-32">
        <div className="relative overflow-hidden rounded-[38px] bg-gray-950 px-6 py-14 text-white shadow-2xl sm:px-10 lg:grid lg:grid-cols-[1.2fr_.8fr] lg:items-center lg:px-14 lg:py-16">
          <div className="absolute right-[-100px] top-[-120px] h-80 w-80 rounded-full bg-violet-600/40 blur-3xl" />
          <div className="absolute bottom-[-140px] left-[45%] h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-violet-300">Kelo ID + Kelo Social</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.04em] sm:text-5xl">Moins de faux comptes. Plus de contexte.</h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">La vérification est gérée séparément par Kelo ID afin que Kelo Social puisse reconnaître un statut sans transformer vos documents d’identité en données publiques du réseau social.</p>
          </div>
          <div className="relative mt-10 flex lg:mt-0 lg:justify-end">
            <Link href="https://kelo-id.eu" className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-7 font-black text-gray-950 transition hover:-translate-y-1 hover:bg-violet-50">
              Découvrir Kelo ID
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-violet-100 bg-gradient-to-b from-white to-violet-50/60">
        <div className="mx-auto max-w-5xl px-5 py-24 text-center sm:px-8 lg:py-28">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-violet-600">Prêt à essayer ?</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-6xl">Votre prochain fil peut commencer ici.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-600">Créez votre compte ou connectez un compte AT Protocol compatible et découvrez Kelo Social.</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex min-h-14 items-center justify-center rounded-full bg-gray-950 px-8 font-black text-white transition hover:-translate-y-1 hover:bg-violet-700">Créer un compte</Link>
            <Link href="/login" className="inline-flex min-h-14 items-center justify-center rounded-full border border-gray-200 bg-white px-8 font-black text-gray-800 transition hover:-translate-y-1 hover:border-violet-200 hover:text-violet-700">Se connecter</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <img src={LOGO} alt="Kelo Social" className="h-10 w-auto object-contain" />
              <p className="mt-3 text-sm text-gray-500">Une expérience sociale construite autour d’AT Protocol.</p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-gray-500">
              <Link href="/legal-notice" className="transition hover:text-violet-700">Mentions légales</Link>
              <Link href="/terms" className="transition hover:text-violet-700">Conditions générales</Link>
              <Link href="/privacy" className="transition hover:text-violet-700">Confidentialité</Link>
              <Link href="/cookies" className="transition hover:text-violet-700">Cookies</Link>
              <Link href="/community-rules" className="transition hover:text-violet-700">Règles et modération</Link>
              <Link href="/verification-policy" className="transition hover:text-violet-700">Vérification</Link>
            </nav>
          </div>
          <div className="mt-8 flex flex-col gap-3 border-t border-gray-100 pt-6 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 Kelo Social</span>
            <span>Français · Version bêta</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
