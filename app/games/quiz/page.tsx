"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Gamepad2, Globe2, Medal, Play, RotateCcw, Sparkles, Trophy, UserRound, UsersRound } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTranslation } from "@/components/providers/TranslationProvider";
import { createQuizQuestions, ESTIMATED_QUESTION_VARIANTS, QUIZ_THEMES, QuizQuestion } from "@/lib/quiz/question-bank";

type Mode = "solo" | "friend" | "online";
type Screen = "lobby" | "waiting" | "playing" | "results";
type RoomPlayer = { id: string; handle: string; score: number; finished: boolean };
type Room = { id: string; mode: "friend" | "online"; seed: string; themes: string[]; started: boolean; players: RoomPlayer[] };

const QUESTION_COUNT = 15;
const QUESTION_TIME = 15;

function difficultyLabel(value: number) {
  return ["", "Très facile", "Facile", "Moyen", "Difficile", "Expert"][value] || "Moyen";
}

export default function QuizKeloPage() {
  const { checked, handle } = useRequireAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("solo");
  const [screen, setScreen] = useState<Screen>("lobby");
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [seconds, setSeconds] = useState(QUESTION_TIME);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState(0);
  const [friendCode, setFriendCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [networkError, setNetworkError] = useState("");

  useEffect(() => { setBestScore(Number(localStorage.getItem("kelo.quiz.bestScore") || 0)); }, []);

  useEffect(() => {
    if (screen !== "playing" || selectedAnswer !== null) return;
    if (seconds <= 0) { answerQuestion(-1); return; }
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds, screen, selectedAnswer]);

  useEffect(() => {
    if (screen !== "waiting" || !room) return;
    const poll = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/quiz/match?room=${encodeURIComponent(room.id)}`, { cache: "no-store" });
        if (!response.ok) return;
        const nextRoom = await response.json();
        setRoom(nextRoom);
        if (nextRoom.started) beginWithSeed(nextRoom.seed, nextRoom.themes);
      } catch {}
    }, 1500);
    return () => window.clearInterval(poll);
  }, [screen, room?.id]);

  const currentQuestion = questions[index];
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0;
  const displayVariants = useMemo(() => Math.max(10000, Math.floor(ESTIMATED_QUESTION_VARIANTS)), []);
  const logout = () => { localStorage.clear(); window.location.href = "/login"; };
  const toggleTheme = (theme: string) => setSelectedThemes((current) => current.includes(theme) ? current.filter((item) => item !== theme) : [...current, theme]);
  const resetRun = () => { setIndex(0); setScore(0); setStreak(0); setSeconds(QUESTION_TIME); setSelectedAnswer(null); };
  const beginWithSeed = (seed: string, themes = selectedThemes) => { resetRun(); setQuestions(createQuizQuestions(seed, themes, QUESTION_COUNT)); setScreen("playing"); };
  const startSolo = () => beginWithSeed(`solo:${handle}:${Date.now()}`);

  const roomAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setNetworkError("");
    try {
      const response = await fetch("/api/quiz/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, handle, playerId: playerId || undefined, themes: selectedThemes, ...extra }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "network_error");
      if (data.playerId) setPlayerId(data.playerId);
      if (data.room) setRoom(data.room);
      return data;
    } catch (error) {
      console.error("Quiz multiplayer error", error);
      setNetworkError("Impossible de rejoindre la partie pour le moment. Réessaie dans quelques secondes.");
      return null;
    }
  };

  const createFriendRoom = async () => { setMode("friend"); const data = await roomAction("create_friend"); if (!data) return; setFriendCode(data.room.id); setScreen("waiting"); };
  const joinFriendRoom = async () => { const code = joinCode.trim().toUpperCase(); if (!code) return; setMode("friend"); const data = await roomAction("join_friend", { room: code }); if (!data) return; setFriendCode(code); if (data.room.started) beginWithSeed(data.room.seed, data.room.themes); else setScreen("waiting"); };
  const findOnline = async () => { setMode("online"); const data = await roomAction("find_online"); if (!data) return; if (data.room.started) beginWithSeed(data.room.seed, data.room.themes); else setScreen("waiting"); };

  const answerQuestion = (answerIndex: number) => {
    if (!currentQuestion || selectedAnswer !== null) return;
    setSelectedAnswer(answerIndex);
    const correct = answerIndex === currentQuestion.correctIndex;
    const nextStreak = correct ? streak + 1 : 0;
    const earned = correct ? 500 + seconds * 25 + Math.min(nextStreak, 5) * 50 : 0;
    if (correct) setScore((value) => value + earned);
    setStreak(nextStreak);
    window.setTimeout(() => {
      if (index + 1 >= questions.length) finishGame(score + earned);
      else { setIndex((value) => value + 1); setSelectedAnswer(null); setSeconds(QUESTION_TIME); }
    }, 900);
  };

  const finishGame = async (finalScore: number) => {
    setScore(finalScore);
    if (finalScore > bestScore) { setBestScore(finalScore); localStorage.setItem("kelo.quiz.bestScore", String(finalScore)); }
    setScreen("results");
    if (mode !== "solo" && room) { const data = await roomAction("submit_score", { room: room.id, score: finalScore }); if (data?.room) setRoom(data.room); }
  };

  const copyInvite = async () => { await navigator.clipboard?.writeText(`${window.location.origin}/games/quiz?room=${friendCode}`); };

  useEffect(() => {
    if (!checked) return;
    const roomFromUrl = new URLSearchParams(window.location.search).get("room");
    if (roomFromUrl) setJoinCode(roomFromUrl.toUpperCase());
  }, [checked]);

  if (!checked) return <div className="flex min-h-screen items-center justify-center bg-kelo-background text-kelo-muted">{t("common.loading", "Vérification de votre session...")}</div>;

  return <div className="min-h-screen bg-kelo-background text-kelo-text"><div className="flex min-h-screen"><Sidebar handle={handle} onLogout={logout}/><main className="min-w-0 flex-1 pb-28 md:pb-10">
    <header className="sticky top-0 z-20 border-b border-kelo-border bg-white/90 px-4 py-4 backdrop-blur-xl md:px-8"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4"><div><div className="flex items-center gap-2"><Gamepad2 className="h-6 w-6 text-kelo-primary"/><h1 className="text-2xl font-black">Quiz Kelo</h1></div><p className="mt-1 text-sm text-kelo-muted">15 questions de culture générale, seul ou à plusieurs.</p></div><div className="hidden rounded-2xl bg-kelo-background px-4 py-2 text-right sm:block"><p className="text-xs text-kelo-muted">Meilleur score</p><p className="font-black">{bestScore.toLocaleString("fr-FR")} pts</p></div></div></header>
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      {screen === "lobby" && <><section className="relative overflow-hidden rounded-[32px] bg-kelo-gradient p-6 text-white shadow-xl md:p-10"><div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/15 blur-2xl"/><div className="relative max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold"><Sparkles className="h-4 w-4"/>Quiz Kelo</span><h2 className="mt-4 text-4xl font-black md:text-5xl">15 questions. Tous les thèmes. Jusqu&apos;au niveau expert.</h2><p className="mt-4 max-w-2xl text-white/85">Questions faciles à expertes et plus de {displayVariants.toLocaleString("fr-FR")} variantes disponibles.</p></div></section>
      <section className="mt-6 grid gap-4 md:grid-cols-3"><ModeCard active={mode === "solo"} icon={<UserRound className="h-7 w-7"/>} title="Jouer seul" description="15 questions aléatoires pour battre ton meilleur score." onClick={() => setMode("solo")}/><ModeCard active={mode === "friend"} icon={<UsersRound className="h-7 w-7"/>} title="Contre un ami" description="Crée un code de partie ou rejoins celui d'un ami." onClick={() => setMode("friend")}/><ModeCard active={mode === "online"} icon={<Globe2 className="h-7 w-7"/>} title="Jouer en ligne" description="Recherche automatiquement d'autres joueurs connectés." onClick={() => setMode("online")}/></section>
      <section className="mt-6 rounded-[28px] border border-kelo-border bg-white p-5 shadow-sm md:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-black">Thèmes</h3><p className="text-sm text-kelo-muted">Aucun thème sélectionné = mélange général.</p></div>{selectedThemes.length > 0 && <button onClick={() => setSelectedThemes([])} className="rounded-full bg-kelo-background px-4 py-2 text-sm font-bold">Tout mélanger</button>}</div><div className="mt-4 flex flex-wrap gap-2">{QUIZ_THEMES.map((theme) => <button key={theme} onClick={() => toggleTheme(theme)} className={`rounded-full border px-4 py-2 text-sm font-bold transition ${selectedThemes.includes(theme) ? "border-transparent bg-kelo-gradient text-white" : "border-kelo-border bg-white hover:bg-kelo-background"}`}>{theme}</button>)}</div></section>
      <section className="mt-6 rounded-[28px] border border-kelo-border bg-white p-5 shadow-sm md:p-7">{mode === "solo" && <button onClick={startSolo} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-kelo-gradient py-4 text-lg font-black text-white shadow-lg"><Play className="h-5 w-5"/>Commencer le Quiz Kelo</button>}{mode === "friend" && <div className="grid gap-4 md:grid-cols-2"><button onClick={createFriendRoom} className="rounded-2xl bg-kelo-gradient p-5 text-left text-white"><UsersRound className="h-7 w-7"/><p className="mt-3 text-lg font-black">Créer une partie</p><p className="mt-1 text-sm text-white/80">Un code sera généré pour ton ami.</p></button><div className="rounded-2xl bg-kelo-background p-5"><p className="font-black">Rejoindre avec un code</p><div className="mt-3 flex gap-2"><input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} maxLength={8} placeholder="ABC123" className="min-w-0 flex-1 rounded-xl border border-kelo-border bg-white px-4 py-3 font-bold uppercase outline-none focus:ring-2 focus:ring-kelo-primary"/><button onClick={joinFriendRoom} className="rounded-xl bg-kelo-text px-4 font-bold text-white">Rejoindre</button></div></div></div>}{mode === "online" && <button onClick={findOnline} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-kelo-gradient py-4 text-lg font-black text-white shadow-lg"><Globe2 className="h-5 w-5"/>Trouver des joueurs</button>}{networkError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{networkError}</p>}</section></>}
      {screen === "waiting" && room && <section className="mx-auto max-w-2xl rounded-[32px] border border-kelo-border bg-white p-7 text-center shadow-xl md:p-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-kelo-gradient text-white"><UsersRound className="h-8 w-8"/></div><h2 className="mt-5 text-3xl font-black">En attente de joueurs</h2><p className="mt-2 text-kelo-muted">La partie démarre automatiquement dès qu&apos;au moins deux joueurs sont présents.</p>{mode === "friend" && <div className="mt-6 rounded-2xl bg-kelo-background p-5"><p className="text-sm text-kelo-muted">Code de la partie</p><p className="mt-1 text-4xl font-black tracking-[0.2em]">{friendCode || room.id}</p><button onClick={copyInvite} className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm"><Copy className="h-4 w-4"/>Copier le lien d&apos;invitation</button></div>}<div className="mt-6 space-y-2 text-left">{room.players.map((player) => <div key={player.id} className="flex items-center justify-between rounded-xl bg-kelo-background px-4 py-3"><span className="font-bold">@{player.handle}</span><span className="text-sm text-kelo-muted">Prêt</span></div>)}</div><button onClick={() => { setScreen("lobby"); setRoom(null); }} className="mt-6 text-sm font-bold text-kelo-muted">Annuler</button></section>}
      {screen === "playing" && currentQuestion && <section className="mx-auto max-w-3xl"><div className="mb-4 flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-kelo-muted">Question {index + 1}/{questions.length}</p><p className="mt-1 text-sm font-semibold">{currentQuestion.theme} · {difficultyLabel(currentQuestion.difficulty)}</p></div><div className="rounded-2xl bg-white px-4 py-2 text-right shadow-sm"><p className="text-xs text-kelo-muted">Score</p><p className="font-black">{score.toLocaleString("fr-FR")}</p></div></div><div className="h-2 overflow-hidden rounded-full bg-white"><div className="h-full bg-kelo-gradient transition-all" style={{ width: `${progress}%` }}/></div><div className="mt-5 rounded-[32px] border border-kelo-border bg-white p-6 shadow-xl md:p-9"><div className="flex items-center justify-between"><span className="rounded-full bg-kelo-background px-3 py-1 text-sm font-bold">🔥 Série : {streak}</span><span className={`text-lg font-black ${seconds <= 5 ? "text-red-600" : "text-kelo-text"}`}>{seconds}s</span></div><h2 className="mt-7 text-2xl font-black leading-tight md:text-3xl">{currentQuestion.question}</h2><div className="mt-7 grid gap-3 sm:grid-cols-2">{currentQuestion.options.map((option, optionIndex) => { const answered = selectedAnswer !== null; const correct = optionIndex === currentQuestion.correctIndex; const chosen = selectedAnswer === optionIndex; const stateClass = answered ? correct ? "border-green-500 bg-green-50 text-green-800" : chosen ? "border-red-500 bg-red-50 text-red-800" : "border-kelo-border bg-kelo-background text-kelo-muted" : "border-kelo-border bg-white hover:border-kelo-primary hover:bg-kelo-background"; return <button key={`${option}-${optionIndex}`} disabled={answered} onClick={() => answerQuestion(optionIndex)} className={`min-h-24 rounded-2xl border-2 p-4 text-left font-extrabold transition ${stateClass}`}><span className="mr-2 text-kelo-muted">{String.fromCharCode(65 + optionIndex)}.</span>{option}</button>; })}</div></div></section>}
      {screen === "results" && <section className="mx-auto max-w-2xl rounded-[32px] border border-kelo-border bg-white p-7 text-center shadow-xl md:p-10"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-kelo-gradient text-white shadow-lg"><Trophy className="h-10 w-10"/></div><h2 className="mt-5 text-3xl font-black">Partie terminée !</h2><p className="mt-2 text-kelo-muted">Ton score sur {QUESTION_COUNT} questions</p><p className="mt-4 text-5xl font-black">{score.toLocaleString("fr-FR")}</p><p className="font-bold text-kelo-primary">points</p>{room && <div className="mt-7 rounded-2xl bg-kelo-background p-5 text-left"><div className="mb-3 flex items-center gap-2 font-black"><Medal className="h-5 w-5"/>Classement de la partie</div>{[...room.players].sort((a, b) => b.score - a.score).map((player, position) => <div key={player.id} className="flex items-center justify-between border-t border-kelo-border py-3 first:border-0"><span className="font-bold">#{position + 1} @{player.handle}</span><span className="font-black">{player.finished ? `${player.score.toLocaleString("fr-FR")} pts` : "En jeu"}</span></div>)}</div>}<div className="mt-7 grid gap-3 sm:grid-cols-2"><button onClick={() => beginWithSeed(`${mode}:${handle}:${Date.now()}`, room?.themes || selectedThemes)} className="flex items-center justify-center gap-2 rounded-2xl bg-kelo-gradient py-4 font-black text-white"><RotateCcw className="h-5 w-5"/>Rejouer</button><button onClick={() => { setScreen("lobby"); setRoom(null); }} className="rounded-2xl bg-kelo-background py-4 font-black">Retour au Quiz</button></div></section>}
    </div>
  </main></div></div>;
}

function ModeCard({ active, icon, title, description, onClick }: { active: boolean; icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return <button onClick={onClick} className={`rounded-[26px] border p-5 text-left transition ${active ? "border-kelo-primary bg-white shadow-lg ring-2 ring-kelo-primary/15" : "border-kelo-border bg-white hover:-translate-y-0.5 hover:shadow-md"}`}><div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${active ? "bg-kelo-gradient text-white" : "bg-kelo-background text-kelo-primary"}`}>{icon}</div><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-1 text-sm leading-6 text-kelo-muted">{description}</p></button>;
}
