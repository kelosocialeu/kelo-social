"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Bot, Crown, Gamepad2, Layers3, Sparkles, Trophy, UsersRound } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTranslation } from "@/components/providers/TranslationProvider";

export default function GamesPage() {
  const { checked, handle } = useRequireAuth();
  const { t } = useTranslation();
  const [bestQuiz, setBestQuiz] = useState(0);
  const [chessRating, setChessRating] = useState(1200);

  useEffect(() => {
    setBestQuiz(Number(localStorage.getItem("kelo.quiz.bestScore") || 0));
    setChessRating(Number(localStorage.getItem("kelo.chess.rating") || 1200));
  }, []);

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!checked) return <div className="flex min-h-screen items-center justify-center bg-kelo-background text-kelo-muted">{t("common.loading", "Vérification de votre session...")}</div>;

  return (
    <div className="min-h-screen bg-kelo-background text-kelo-text">
      <div className="flex min-h-screen">
        <Sidebar handle={handle} onLogout={logout} />
        <main className="min-w-0 flex-1 pb-28 md:pb-10">
          <header className="sticky top-0 z-20 border-b border-kelo-border bg-white/90 px-4 py-4 backdrop-blur-xl md:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="flex items-center gap-2"><Gamepad2 className="h-6 w-6 text-kelo-primary"/><h1 className="text-2xl font-black">Jeux</h1></div>
              <p className="mt-1 text-sm text-kelo-muted">Choisis un jeu et joue seul, contre un robot, avec tes amis ou avec la communauté Kelo.</p>
            </div>
          </header>

          <div className="mx-auto max-w-6xl p-4 md:p-8">
            <section className="mb-8">
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-kelo-primary">Kelo Games</p>
              <h2 className="mt-2 text-3xl font-black md:text-4xl">À quoi veux-tu jouer ?</h2>
              <p className="mt-2 max-w-2xl text-kelo-muted">Tous les jeux disponibles sont réunis ici. Clique sur celui qui t'intéresse pour ouvrir son salon et choisir ton mode de jeu.</p>
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <GameCard
                href="/games/quiz"
                icon={<Sparkles className="h-8 w-8"/>}
                title="Quiz Kelo"
                eyebrow="Culture générale"
                description="15 questions aléatoires, plusieurs thèmes et une difficulté qui va du très facile jusqu'au niveau expert."
                modes={["Solo", "Ami", "En ligne"]}
                stat={bestQuiz > 0 ? `Record : ${bestQuiz.toLocaleString("fr-FR")} pts` : "15 questions par partie"}
                visual="quiz"
              />
              <GameCard
                href="/games/cards"
                icon={<Layers3 className="h-8 w-8"/>}
                title="Kelo Cards"
                eyebrow="Jeu de cartes original"
                description="Constellations, le jeu de cartes Kelo : couleurs, valeurs et cartes spéciales pour renverser la partie."
                modes={["Robot", "Ami", "Joueur aléatoire"]}
                stat="Rapide et stratégique"
                visual="cards"
              />
              <GameCard
                href="/games/uno"
                icon={<Gamepad2 className="h-8 w-8"/>}
                title="Uno Kelo"
                eyebrow="Jeu de défausse"
                description="Associe couleurs, chiffres et cartes spéciales. Vide ta main avant ton adversaire et annonce UNO Kelo au bon moment."
                modes={["Robot", "Ami", "Joueur aléatoire"]}
                stat="7 cartes au départ"
                visual="uno"
              />
              <GameCard
                href="/games/chess"
                icon={<Crown className="h-8 w-8"/>}
                title="Kelo Échecs"
                eyebrow="Échecs classiques"
                description="Le jeu d'échecs complet avec robot, parties privées et matchs classés contre la communauté."
                modes={["Robot", "Ami", "Tournoi classé"]}
                stat={`Classement : ${chessRating}`}
                visual="chess"
              />
            </section>

            <section className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-kelo-border bg-white p-5"><Bot className="h-6 w-6 text-kelo-primary"/><h3 className="mt-3 font-black">Jouer immédiatement</h3><p className="mt-1 text-sm leading-6 text-kelo-muted">Les jeux compatibles proposent un robot pour commencer une partie sans attendre un autre joueur.</p></div>
              <div className="rounded-3xl border border-kelo-border bg-white p-5"><UsersRound className="h-6 w-6 text-kelo-primary"/><h3 className="mt-3 font-black">Jouer ensemble</h3><p className="mt-1 text-sm leading-6 text-kelo-muted">Invite un ami ou trouve automatiquement quelqu'un de connecté selon le jeu choisi.</p></div>
              <div className="rounded-3xl border border-kelo-border bg-white p-5"><Trophy className="h-6 w-6 text-kelo-primary"/><h3 className="mt-3 font-black">Défis et classement</h3><p className="mt-1 text-sm leading-6 text-kelo-muted">Les modes compétitifs permettent de progresser et de comparer tes résultats avec les autres joueurs.</p></div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function GameCard({ href, icon, title, eyebrow, description, modes, stat, visual }: { href: string; icon: React.ReactNode; title: string; eyebrow: string; description: string; modes: string[]; stat: string; visual: "quiz" | "cards" | "uno" | "chess" }) {
  return (
    <Link href={href} className="group overflow-hidden rounded-[30px] border border-kelo-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-44 overflow-hidden bg-kelo-gradient p-5 text-white">
        <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl"/>
        <div className="relative flex items-start justify-between"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">{icon}</div><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold backdrop-blur">Disponible</span></div>
        {visual === "quiz" && <div className="absolute bottom-4 right-5 text-6xl font-black text-white/25">?</div>}
        {visual === "cards" && <div className="absolute bottom-3 right-5 flex -space-x-6"><span className="rotate-[-12deg] rounded-xl border border-white/40 bg-white/20 px-5 py-7 text-2xl font-black backdrop-blur">K</span><span className="rotate-[8deg] rounded-xl border border-white/40 bg-white/25 px-5 py-7 text-2xl font-black backdrop-blur">★</span></div>}
        {visual === "uno" && <div className="absolute bottom-2 right-5 flex -space-x-5"><span className="rotate-[-14deg] rounded-xl border-2 border-white/50 bg-red-500 px-4 py-6 text-2xl font-black">7</span><span className="rotate-[3deg] rounded-xl border-2 border-white/50 bg-yellow-400 px-4 py-6 text-2xl font-black text-black">+2</span><span className="rotate-[14deg] rounded-xl border-2 border-white/50 bg-blue-500 px-4 py-6 text-2xl font-black">↻</span></div>}
        {visual === "chess" && <div className="absolute bottom-1 right-4 text-7xl text-white/30">♞</div>}
      </div>
      <div className="p-5">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-kelo-primary">{eyebrow}</p>
        <div className="mt-2 flex items-center justify-between gap-3"><h3 className="text-2xl font-black">{title}</h3><ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1"/></div>
        <p className="mt-2 min-h-[72px] text-sm leading-6 text-kelo-muted">{description}</p>
        <div className="mt-4 flex flex-wrap gap-2">{modes.map((mode) => <span key={mode} className="rounded-full bg-kelo-background px-3 py-1 text-xs font-bold">{mode}</span>)}</div>
        <div className="mt-5 border-t border-kelo-border pt-4 text-sm font-extrabold">{stat}</div>
      </div>
    </Link>
  );
}
