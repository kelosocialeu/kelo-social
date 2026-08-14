"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";

export default function LandingPage() {
  const router = useRouter();
  const { session, checked } = useAuthContext();

  useEffect(() => {
    if (checked && session) router.replace("/feed");
  }, [checked, session, router]);

  if (!checked || session) return <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-violet-50 via-white to-pink-50"><div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></main>;

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50 text-gray-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6">
        <img src="https://kelosocial.sirv.com/logo.png" alt="Kelo Social" className="mb-8 h-36" />
        <span className="rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 px-5 py-2 text-sm font-bold text-white shadow-lg">Version Bêta</span>
        <h1 className="mt-8 text-center text-6xl font-black tracking-tight">Bienvenue sur<span className="block bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">Kelo Social</span></h1>
        <p className="mt-6 max-w-2xl text-center text-lg text-gray-600">Le réseau social européen basé sur l&apos;AT Protocol. Connectez-vous avec votre fournisseur d&apos;identité préféré, échangez librement et gardez le contrôle de vos données.</p>
        <div className="mt-12 flex w-full max-w-md flex-col gap-4"><Link href="/signup" className="rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 py-4 text-center text-lg font-bold text-white shadow-xl transition hover:scale-105">Créer un compte</Link><Link href="/login" className="rounded-full border border-violet-200 bg-white py-4 text-center text-lg font-bold text-violet-700 shadow transition hover:bg-violet-50">Se connecter</Link></div>
        <div className="mt-16 grid max-w-5xl gap-6 md:grid-cols-3"><div className="rounded-3xl bg-white p-6 shadow-lg"><div className="mb-3 text-3xl">🌍</div><h3 className="text-lg font-bold">Fédération</h3><p className="mt-2 text-sm text-gray-600">Compatible avec plusieurs PDS et l&apos;ensemble de l&apos;écosystème AT Protocol.</p></div><div className="rounded-3xl bg-white p-6 shadow-lg"><div className="mb-3 text-3xl">🛡️</div><h3 className="text-lg font-bold">Vérification</h3><p className="mt-2 text-sm text-gray-600">Les comptes peuvent être vérifiés grâce à Kelo ID et recevoir des badges de certification.</p></div><div className="rounded-3xl bg-white p-6 shadow-lg"><div className="mb-3 text-3xl">🚀</div><h3 className="text-lg font-bold">Moderne</h3><p className="mt-2 text-sm text-gray-600">Une interface rapide et pensée pour offrir une expérience agréable sur ordinateur comme sur mobile.</p></div></div>
      </div>
      <footer className="border-t border-gray-200 bg-white/80 backdrop-blur"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 md:flex-row"><div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm"><Link href="/legal-notice" className="hover:text-violet-600">Mentions légales</Link><Link href="/terms" className="hover:text-violet-600">Conditions générales</Link><Link href="/privacy" className="hover:text-violet-600">Confidentialité</Link><Link href="/cookies" className="hover:text-violet-600">Cookies</Link><Link href="/community-rules" className="hover:text-violet-600">Règles et modération</Link><Link href="/verification-policy" className="hover:text-violet-600">Vérification et certification</Link></div><span className="text-sm text-gray-500">🌐 Français</span></div></footer>
    </main>
  );
}
