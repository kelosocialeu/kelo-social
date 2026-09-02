"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bot, Copy, Gamepad2, Globe2, RefreshCcw, UsersRound } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type Color = "Rouge" | "Bleu" | "Vert" | "Jaune";
type Kind = "number" | "skip" | "reverse" | "draw2" | "wild" | "wild4";
type UnoCard = { id: string; color: Color | "Joker"; kind: Kind; value?: number };
type UnoState = {
  hands: [UnoCard[], UnoCard[]];
  drawPile: UnoCard[];
  discard: UnoCard[];
  currentColor: Color;
  turn: 0 | 1;
  finished: boolean;
  winner: 0 | 1 | null;
  message: string;
  unoCalled: [boolean, boolean];
};
type Room = { id: string; players: { id: string; handle: string; rating: number }[]; state: UnoState | null; started: boolean; finished: boolean; winnerId?: string };
type Mode = "robot" | "friend" | "online";

const COLORS: Color[] = ["Rouge", "Bleu", "Vert", "Jaune"];

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildDeck() {
  const deck: UnoCard[] = [];
  COLORS.forEach((color) => {
    deck.push({ id: `${color}-0`, color, kind: "number", value: 0 });
    for (let value = 1; value <= 9; value += 1) {
      deck.push({ id: `${color}-${value}-a`, color, kind: "number", value });
      deck.push({ id: `${color}-${value}-b`, color, kind: "number", value });
    }
    (["skip", "reverse", "draw2"] as Kind[]).forEach((kind) => {
      deck.push({ id: `${color}-${kind}-a`, color, kind });
      deck.push({ id: `${color}-${kind}-b`, color, kind });
    });
  });
  for (let i = 0; i < 4; i += 1) {
    deck.push({ id: `wild-${i}`, color: "Joker", kind: "wild" });
    deck.push({ id: `wild4-${i}`, color: "Joker", kind: "wild4" });
  }
  return shuffle(deck);
}

function buildGame(): UnoState {
  const deck = buildDeck();
  const hands: [UnoCard[], UnoCard[]] = [deck.splice(0, 7), deck.splice(0, 7)];
  let first = deck.shift()!;
  while (first.color === "Joker") {
    deck.push(first);
    first = deck.shift()!;
  }
  return {
    hands,
    drawPile: deck,
    discard: [first],
    currentColor: first.color as Color,
    turn: 0,
    finished: false,
    winner: null,
    message: "La partie commence.",
    unoCalled: [false, false],
  };
}

function topCard(state: UnoState) {
  return state.discard[state.discard.length - 1];
}

function canPlay(card: UnoCard, state: UnoState) {
  const top = topCard(state);
  if (card.color === "Joker") return true;
  if (card.color === state.currentColor) return true;
  if (card.kind === "number" && top.kind === "number" && card.value === top.value) return true;
  return card.kind !== "number" && card.kind === top.kind;
}

function ensureDrawCards(state: UnoState, amount: number) {
  const next: UnoState = JSON.parse(JSON.stringify(state));
  if (next.drawPile.length < amount) {
    const keep = next.discard.pop()!;
    next.drawPile = shuffle([...next.drawPile, ...next.discard]);
    next.discard = [keep];
  }
  return next;
}

function drawCards(state: UnoState, player: 0 | 1, amount: number) {
  const next = ensureDrawCards(state, amount);
  for (let i = 0; i < amount; i += 1) {
    const card = next.drawPile.shift();
    if (card) next.hands[player].push(card);
  }
  next.unoCalled[player] = false;
  return next;
}

function playCard(state: UnoState, player: 0 | 1, cardIndex: number, chosenColor?: Color) {
  if (state.finished || state.turn !== player) return state;
  const card = state.hands[player][cardIndex];
  if (!card || !canPlay(card, state)) return state;

  let next: UnoState = JSON.parse(JSON.stringify(state));
  const played = next.hands[player].splice(cardIndex, 1)[0];
  next.discard.push(played);
  if (played.color === "Joker") next.currentColor = chosenColor || COLORS[Math.floor(Math.random() * COLORS.length)];
  else next.currentColor = played.color;

  const other: 0 | 1 = player === 0 ? 1 : 0;
  next.unoCalled[player] = next.hands[player].length === 1 ? next.unoCalled[player] : false;

  if (next.hands[player].length === 0) {
    next.finished = true;
    next.winner = player;
    next.message = `@${player === 0 ? "Joueur 1" : "Joueur 2"} gagne !`;
    return next;
  }

  if (played.kind === "draw2") {
    next = drawCards(next, other, 2);
    next.turn = player;
    next.message = "+2 : l'adversaire pioche 2 cartes et passe son tour.";
  } else if (played.kind === "wild4") {
    next = drawCards(next, other, 4);
    next.turn = player;
    next.message = "+4 : couleur changée, l'adversaire pioche et passe.";
  } else if (played.kind === "skip" || played.kind === "reverse") {
    next.turn = player;
    next.message = played.kind === "skip" ? "Tour sauté !" : "Sens inversé : à deux joueurs, tu rejoues.";
  } else {
    next.turn = other;
    next.message = "À l'adversaire.";
  }
  return next;
}

function robotChoice(state: UnoState) {
  const playable = state.hands[1].map((card, index) => ({ card, index })).filter(({ card }) => canPlay(card, state));
  if (!playable.length) return null;
  playable.sort((a, b) => {
    const score = (card: UnoCard) => card.kind === "wild4" ? 6 : card.kind === "draw2" ? 5 : card.kind === "skip" || card.kind === "reverse" ? 4 : card.kind === "wild" ? 3 : 1;
    return score(b.card) - score(a.card);
  });
  return playable[0];
}

function cardLabel(card: UnoCard) {
  if (card.kind === "number") return String(card.value);
  if (card.kind === "skip") return "⊘";
  if (card.kind === "reverse") return "↻";
  if (card.kind === "draw2") return "+2";
  if (card.kind === "wild4") return "+4";
  return "★";
}

function cardClass(card: UnoCard) {
  if (card.color === "Rouge") return "from-red-500 to-rose-600";
  if (card.color === "Bleu") return "from-blue-500 to-indigo-600";
  if (card.color === "Vert") return "from-emerald-500 to-green-700";
  if (card.color === "Jaune") return "from-yellow-400 to-amber-500 text-black";
  return "from-fuchsia-500 via-violet-500 to-sky-500";
}

export default function UnoKeloPage() {
  const { checked, handle } = useRequireAuth();
  const [mode, setMode] = useState<Mode>("robot");
  const [game, setGame] = useState<UnoState | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [status, setStatus] = useState("");
  const [wildCardIndex, setWildCardIndex] = useState<number | null>(null);

  const playerIndex: 0 | 1 = useMemo(() => {
    if (!room || !playerId) return 0;
    return room.players[1]?.id === playerId ? 1 : 0;
  }, [room, playerId]);

  const logout = () => { localStorage.clear(); window.location.href = "/login"; };

  const callRoom = async (action: string, extra: Record<string, unknown> = {}) => {
    const response = await fetch("/api/games/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, game: "uno", handle, playerId: playerId || undefined, ...extra }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "network_error");
    if (data.playerId) setPlayerId(data.playerId);
    if (data.room) setRoom(data.room);
    return data;
  };

  const startRobot = () => { setMode("robot"); setRoom(null); setStatus(""); setGame(buildGame()); };

  const createFriend = async () => {
    try {
      setMode("friend"); setStatus("Création de la partie…");
      const data = await callRoom("create");
      setRoom(data.room); setGame(null); setStatus("En attente de ton ami.");
    } catch { setStatus("Impossible de créer la partie."); }
  };

  const joinFriend = async () => {
    if (!joinCode.trim()) return;
    try {
      setMode("friend");
      const data = await callRoom("join", { room: joinCode.trim().toUpperCase() });
      setRoom(data.room); setStatus("Partie rejointe.");
    } catch { setStatus("Code introuvable ou partie indisponible."); }
  };

  const findOnline = async () => {
    try {
      setMode("online"); setStatus("Recherche d'un joueur…");
      const data = await callRoom("find");
      setRoom(data.room); setStatus(data.room.started ? "Adversaire trouvé !" : "En attente d'un adversaire…");
    } catch { setStatus("Matchmaking indisponible."); }
  };

  useEffect(() => {
    if (!room || mode === "robot") return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/games/room?room=${encodeURIComponent(room.id)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const nextRoom: Room = data.room;
        setRoom(nextRoom);
        if (nextRoom.started && !nextRoom.state && nextRoom.players[0]?.id === playerId) {
          const initial = buildGame();
          await callRoom("state", { room: nextRoom.id, state: initial });
          setGame(initial);
        } else if (nextRoom.state) setGame(nextRoom.state);
      } catch { /* retry */ }
    }, 1200);
    return () => window.clearInterval(timer);
  }, [room?.id, playerId, mode]);

  useEffect(() => {
    if (mode !== "robot" || !game || game.finished || game.turn !== 1) return;
    const timer = window.setTimeout(() => {
      const choice = robotChoice(game);
      if (!choice) {
        let next = drawCards(game, 1, 1);
        const drawnIndex = next.hands[1].length - 1;
        if (canPlay(next.hands[1][drawnIndex], next)) {
          const card = next.hands[1][drawnIndex];
          const color = card.color === "Joker" ? COLORS[Math.floor(Math.random() * COLORS.length)] : undefined;
          next = playCard(next, 1, drawnIndex, color);
        } else {
          next.turn = 0;
          next.message = "Kelo Bot pioche une carte.";
        }
        setGame(next);
        return;
      }
      const color = choice.card.color === "Joker" ? COLORS[Math.floor(Math.random() * COLORS.length)] : undefined;
      setGame(playCard(game, 1, choice.index, color));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [game, mode]);

  const syncState = async (next: UnoState) => {
    setGame(next);
    if (mode !== "robot" && room) {
      try {
        await callRoom("state", { room: room.id, state: next });
        if (next.finished && next.winner !== null) {
          const winnerId = room.players[next.winner]?.id;
          if (winnerId) await callRoom("finish", { room: room.id, winnerId });
        }
      } catch { setStatus("Synchronisation momentanément interrompue."); }
    }
  };

  const play = async (index: number, chosenColor?: Color) => {
    if (!game) return;
    const me: 0 | 1 = mode === "robot" ? 0 : playerIndex;
    const card = game.hands[me][index];
    if (!card || !canPlay(card, game) || game.turn !== me) return;
    if (card.color === "Joker" && !chosenColor) { setWildCardIndex(index); return; }
    setWildCardIndex(null);
    await syncState(playCard(game, me, index, chosenColor));
  };

  const drawOne = async () => {
    if (!game) return;
    const me: 0 | 1 = mode === "robot" ? 0 : playerIndex;
    if (game.turn !== me || game.finished) return;
    const next = drawCards(game, me, 1);
    next.turn = me === 0 ? 1 : 0;
    next.message = "Carte piochée. Tour terminé.";
    await syncState(next);
  };

  const callUno = async () => {
    if (!game) return;
    const me: 0 | 1 = mode === "robot" ? 0 : playerIndex;
    if (game.hands[me].length !== 1) return;
    const next: UnoState = JSON.parse(JSON.stringify(game));
    next.unoCalled[me] = true;
    next.message = "UNO KELO !";
    await syncState(next);
  };

  if (!checked) return <div className="flex min-h-screen items-center justify-center bg-kelo-background">Chargement…</div>;

  const me: 0 | 1 = mode === "robot" ? 0 : playerIndex;
  const other: 0 | 1 = me === 0 ? 1 : 0;
  const myTurn = !!game && !game.finished && game.turn === me;

  return (
    <div className="min-h-screen bg-kelo-background text-kelo-text"><div className="flex min-h-screen"><Sidebar handle={handle} onLogout={logout}/><main className="min-w-0 flex-1 pb-24">
      <header className="border-b border-kelo-border bg-white/90 px-4 py-4 backdrop-blur-xl md:px-8"><div className="mx-auto flex max-w-6xl items-center gap-3"><Link href="/games" className="rounded-xl bg-kelo-background p-2"><ArrowLeft className="h-5 w-5"/></Link><Gamepad2 className="h-7 w-7 text-kelo-primary"/><div><h1 className="text-2xl font-black">Uno Kelo</h1><p className="text-sm text-kelo-muted">Sois le premier à vider ta main.</p></div></div></header>
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        {!game && <>
          <section className="rounded-[32px] bg-kelo-gradient p-7 text-white shadow-xl md:p-10"><span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">Uno Kelo</span><h2 className="mt-4 text-4xl font-black">Couleurs, cartes spéciales et retournements de situation.</h2><p className="mt-3 max-w-3xl text-white/85">Pose une carte de même couleur, même chiffre ou même symbole. Utilise les +2, +4, passe-tour, inversion et jokers, puis annonce UNO Kelo quand il ne te reste qu'une carte.</p></section>
          <section className="mt-6 grid gap-4 md:grid-cols-3">
            <button onClick={startRobot} className="rounded-[26px] border border-kelo-border bg-white p-6 text-left shadow-sm hover:shadow-md"><Bot className="h-8 w-8 text-kelo-primary"/><h3 className="mt-4 text-xl font-black">Contre le robot</h3><p className="mt-2 text-sm text-kelo-muted">Joue immédiatement contre Kelo Bot.</p></button>
            <button onClick={createFriend} className="rounded-[26px] border border-kelo-border bg-white p-6 text-left shadow-sm hover:shadow-md"><UsersRound className="h-8 w-8 text-kelo-primary"/><h3 className="mt-4 text-xl font-black">Avec un ami</h3><p className="mt-2 text-sm text-kelo-muted">Crée un code privé à partager.</p></button>
            <button onClick={findOnline} className="rounded-[26px] border border-kelo-border bg-white p-6 text-left shadow-sm hover:shadow-md"><Globe2 className="h-8 w-8 text-kelo-primary"/><h3 className="mt-4 text-xl font-black">Joueur aléatoire</h3><p className="mt-2 text-sm text-kelo-muted">Trouve automatiquement quelqu'un connecté.</p></button>
          </section>
          <section className="mt-5 rounded-[26px] border border-kelo-border bg-white p-5"><h3 className="font-black">Rejoindre une partie ami</h3><div className="mt-3 flex gap-2"><input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="CODE" maxLength={8} className="min-w-0 flex-1 rounded-xl border border-kelo-border px-4 py-3 font-bold uppercase"/><button onClick={joinFriend} className="rounded-xl bg-kelo-text px-5 font-bold text-white">Rejoindre</button></div>{room && <div className="mt-4 rounded-xl bg-kelo-background p-4"><p className="text-sm text-kelo-muted">Code</p><div className="flex items-center gap-3"><span className="text-2xl font-black tracking-widest">{room.id}</span><button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/games/uno?room=${room.id}`)}><Copy className="h-4 w-4"/></button></div></div>}{status && <p className="mt-3 text-sm font-semibold text-kelo-muted">{status}</p>}</section>
        </>}

        {game && <section>
          <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-kelo-muted">{mode === "robot" ? "Kelo Bot" : room?.players[other]?.handle ? `@${room.players[other].handle}` : "Adversaire"}</p><p className="text-2xl font-black">{game.hands[other].length} cartes</p></div><div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm"><p className="text-xs text-kelo-muted">Tour</p><p className="font-black">{myTurn ? "À toi" : "Adversaire"}</p></div><div className="text-right"><p className="text-sm font-bold text-kelo-muted">@{handle}</p><p className="text-2xl font-black">{game.hands[me].length} cartes</p></div></div>

          <div className="rounded-[32px] border border-kelo-border bg-white p-5 shadow-xl md:p-8">
            <div className="flex flex-col items-center"><p className="text-sm font-bold text-kelo-muted">Couleur active : <span className="text-kelo-text">{game.currentColor}</span></p><div className={`mt-4 flex h-40 w-28 items-center justify-center rounded-2xl bg-gradient-to-br ${cardClass(topCard(game))} text-4xl font-black text-white shadow-xl`}>{cardLabel(topCard(game))}</div><p className="mt-4 text-sm font-semibold text-kelo-muted">{game.message}</p></div>

            {game.finished ? <div className="mt-7 text-center"><p className="text-4xl font-black">{game.winner === me ? "Tu as gagné ! 🎉" : "Partie terminée"}</p><button onClick={startRobot} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-kelo-gradient px-6 py-3 font-black text-white"><RefreshCcw className="h-5 w-5"/>Rejouer</button></div> : <>
              <div className="mt-7 flex flex-wrap justify-center gap-3">{game.hands[me].map((card, index) => <button key={card.id} disabled={!myTurn || !canPlay(card, game)} onClick={() => play(index)} className={`flex h-32 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${cardClass(card)} text-2xl font-black text-white shadow-lg transition enabled:hover:-translate-y-3 disabled:opacity-35`}>{cardLabel(card)}</button>)}</div>
              <div className="mt-7 flex flex-wrap justify-center gap-3"><button disabled={!myTurn} onClick={drawOne} className="rounded-2xl bg-kelo-text px-6 py-3 font-black text-white disabled:opacity-40">Piocher</button><button disabled={game.hands[me].length !== 1 || game.unoCalled[me]} onClick={callUno} className="rounded-2xl bg-kelo-gradient px-6 py-3 font-black text-white disabled:opacity-40">UNO KELO !</button></div>
            </>}
          </div>
        </section>}

        {wildCardIndex !== null && game && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"><h3 className="text-xl font-black">Choisis la couleur</h3><div className="mt-5 grid grid-cols-2 gap-3">{COLORS.map((color) => <button key={color} onClick={() => play(wildCardIndex, color)} className={`rounded-2xl bg-gradient-to-br ${cardClass({ id: color, color, kind: "number", value: 0 })} px-4 py-5 font-black text-white`}>{color}</button>)}</div><button onClick={() => setWildCardIndex(null)} className="mt-4 w-full rounded-xl bg-kelo-background py-3 font-bold">Annuler</button></div></div>}
      </div>
    </main></div></div>
  );
}
