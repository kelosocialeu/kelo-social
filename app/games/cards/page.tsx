"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Copy, Gamepad2, Globe2, Layers3, RefreshCcw, Trophy, UsersRound } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const COLORS = ["Aura", "Flux", "Nova", "Terra"] as const;
type CardColor = (typeof COLORS)[number];
type Power = "pulse" | "shift" | "link" | null;
type Card = { id: string; color: CardColor; value: number; power: Power };
type Lane = { affinity: CardColor; cards: Card[] };
type CardsState = { hands: [Card[], Card[]]; lanes: Lane[]; scores: [number, number]; turn: 0 | 1; finished: boolean; winner: 0 | 1 | -1 | null };
type Room = { id: string; players: { id: string; handle: string; rating: number }[]; state: CardsState | null; started: boolean; finished: boolean; winnerId?: string };
type Mode = "robot" | "friend" | "online";

function seeded(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildGame(seedValue = Date.now()): CardsState {
  const random = seeded(seedValue >>> 0);
  const deck: Card[] = [];
  COLORS.forEach((color) => {
    for (let value = 1; value <= 9; value += 1) {
      const power: Power = value === 3 ? "link" : value === 6 ? "shift" : value === 9 ? "pulse" : null;
      deck.push({ id: `${color}-${value}-${deck.length}`, color, value, power });
    }
  });
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return {
    hands: [deck.slice(0, 6), deck.slice(6, 12)],
    lanes: [
      { affinity: "Aura", cards: [] },
      { affinity: "Flux", cards: [] },
      { affinity: "Nova", cards: [] },
    ],
    scores: [0, 0],
    turn: 0,
    finished: false,
    winner: null,
  };
}

function cardPoints(card: Card, lane: Lane) {
  const previous = lane.cards[lane.cards.length - 1];
  let points = card.value;
  if (card.color === lane.affinity) points += 3;
  if (previous?.value === card.value) points += 2;
  if (card.power === "link" && previous?.color === card.color) points += 4;
  if (card.power === "pulse") points *= 2;
  return points;
}

function applyMove(state: CardsState, player: 0 | 1, cardIndex: number, laneIndex: number): CardsState {
  if (state.finished || state.turn !== player) return state;
  const hand = state.hands[player];
  const card = hand[cardIndex];
  const lane = state.lanes[laneIndex];
  if (!card || !lane) return state;

  const next: CardsState = JSON.parse(JSON.stringify(state));
  const played = next.hands[player].splice(cardIndex, 1)[0];
  const target = next.lanes[laneIndex];
  const earned = cardPoints(played, target);
  target.cards.push(played);
  next.scores[player] += earned;
  if (played.power === "shift") target.affinity = COLORS[(COLORS.indexOf(target.affinity) + 1) % COLORS.length];

  const noCards = next.hands[0].length === 0 && next.hands[1].length === 0;
  if (noCards) {
    next.finished = true;
    next.winner = next.scores[0] === next.scores[1] ? -1 : next.scores[0] > next.scores[1] ? 0 : 1;
  } else {
    next.turn = player === 0 ? 1 : 0;
  }
  return next;
}

function bestRobotMove(state: CardsState) {
  let best = { card: 0, lane: 0, points: -1 };
  state.hands[1].forEach((card, cardIndex) => {
    state.lanes.forEach((lane, laneIndex) => {
      const points = cardPoints(card, lane);
      if (points > best.points) best = { card: cardIndex, lane: laneIndex, points };
    });
  });
  return best;
}

function colorClass(color: CardColor) {
  return color === "Aura" ? "from-fuchsia-500 to-pink-500" : color === "Flux" ? "from-sky-500 to-cyan-400" : color === "Nova" ? "from-violet-600 to-indigo-500" : "from-emerald-500 to-lime-500";
}

export default function KeloCardsPage() {
  const { checked, handle } = useRequireAuth();
  const [mode, setMode] = useState<Mode>("robot");
  const [game, setGame] = useState<CardsState | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  const playerIndex: 0 | 1 = useMemo(() => {
    if (!room || !playerId) return 0;
    return room.players[1]?.id === playerId ? 1 : 0;
  }, [room, playerId]);

  const logout = () => { localStorage.clear(); window.location.href = "/login"; };

  const callRoom = async (action: string, extra: Record<string, unknown> = {}) => {
    const response = await fetch("/api/games/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, game: "cards", handle, playerId: playerId || undefined, ...extra }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "network_error");
    if (data.playerId) setPlayerId(data.playerId);
    if (data.room) setRoom(data.room);
    return data;
  };

  const startRobot = () => {
    setMode("robot");
    setRoom(null);
    setSelectedCard(null);
    setGame(buildGame(Date.now()));
  };

  const createFriend = async () => {
    try {
      setMode("friend"); setStatus("Création de la table…");
      const data = await callRoom("create");
      setRoom(data.room); setGame(null); setStatus("En attente de ton ami");
    } catch { setStatus("Impossible de créer la partie."); }
  };

  const joinFriend = async () => {
    if (!joinCode.trim()) return;
    try {
      setMode("friend");
      const data = await callRoom("join", { room: joinCode.trim().toUpperCase() });
      setRoom(data.room); setStatus("Connecté à la partie");
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
    if (!room || !room.id || mode === "robot") return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/games/room?room=${encodeURIComponent(room.id)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const nextRoom: Room = data.room;
        setRoom(nextRoom);
        if (nextRoom.started && !nextRoom.state && nextRoom.players[0]?.id === playerId) {
          const initial = buildGame(Date.now());
          await callRoom("state", { room: nextRoom.id, state: initial });
          setGame(initial);
        } else if (nextRoom.state) {
          setGame(nextRoom.state);
        }
      } catch { /* retry */ }
    }, 1200);
    return () => window.clearInterval(timer);
  }, [room?.id, playerId, mode]);

  useEffect(() => {
    if (mode !== "robot" || !game || game.finished || game.turn !== 1) return;
    const timer = window.setTimeout(() => {
      const move = bestRobotMove(game);
      setGame(applyMove(game, 1, move.card, move.lane));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [game, mode]);

  const playToLane = async (laneIndex: number) => {
    if (!game || selectedCard === null) return;
    const me: 0 | 1 = mode === "robot" ? 0 : playerIndex;
    const next = applyMove(game, me, selectedCard, laneIndex);
    if (next === game) return;
    setSelectedCard(null);
    setGame(next);
    if (mode !== "robot" && room) {
      try {
        await callRoom("state", { room: room.id, state: next });
        if (next.finished && next.winner !== -1 && next.winner !== null) {
          const winnerId = room.players[next.winner]?.id;
          if (winnerId) await callRoom("finish", { room: room.id, winnerId });
        }
      } catch { setStatus("Synchronisation momentanément interrompue."); }
    }
  };

  if (!checked) return <div className="flex min-h-screen items-center justify-center bg-kelo-background">Chargement…</div>;

  const myIndex: 0 | 1 = mode === "robot" ? 0 : playerIndex;
  const opponentIndex: 0 | 1 = myIndex === 0 ? 1 : 0;
  const myTurn = !!game && !game.finished && game.turn === myIndex;

  return (
    <div className="min-h-screen bg-kelo-background text-kelo-text">
      <div className="flex min-h-screen">
        <Sidebar handle={handle} onLogout={logout}/>
        <main className="min-w-0 flex-1 pb-24">
          <header className="border-b border-kelo-border bg-white/90 px-4 py-4 backdrop-blur-xl md:px-8">
            <div className="mx-auto flex max-w-6xl items-center gap-3"><Link href="/games" className="rounded-xl bg-kelo-background p-2"><ArrowLeft className="h-5 w-5"/></Link><Layers3 className="h-7 w-7 text-kelo-primary"/><div><h1 className="text-2xl font-black">Kelo Cards</h1><p className="text-sm text-kelo-muted">Le jeu de cartes tactique original de Kelo.</p></div></div>
          </header>

          <div className="mx-auto max-w-6xl p-4 md:p-8">
            {!game && (
              <>
                <section className="rounded-[32px] bg-kelo-gradient p-7 text-white shadow-xl md:p-10"><span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">Kelo Cards · Constellations</span><h2 className="mt-4 text-4xl font-black">Place tes cartes. Crée des connexions. Marque plus que ton adversaire.</h2><p className="mt-3 max-w-3xl text-white/85">Chaque carte rapporte sa valeur, avec des bonus si sa couleur correspond à la voie ou si elle crée une connexion. Les cartes Pulse doublent les points, Shift change l'affinité d'une voie et Link récompense les suites de couleur.</p></section>

                <section className="mt-6 grid gap-4 md:grid-cols-3">
                  <button onClick={startRobot} className="rounded-[26px] border border-kelo-border bg-white p-6 text-left shadow-sm hover:shadow-md"><Bot className="h-8 w-8 text-kelo-primary"/><h3 className="mt-4 text-xl font-black">Contre le robot</h3><p className="mt-2 text-sm text-kelo-muted">Joue immédiatement contre Kelo Bot.</p></button>
                  <button onClick={createFriend} className="rounded-[26px] border border-kelo-border bg-white p-6 text-left shadow-sm hover:shadow-md"><UsersRound className="h-8 w-8 text-kelo-primary"/><h3 className="mt-4 text-xl font-black">Avec un ami</h3><p className="mt-2 text-sm text-kelo-muted">Crée un code privé et partage-le.</p></button>
                  <button onClick={findOnline} className="rounded-[26px] border border-kelo-border bg-white p-6 text-left shadow-sm hover:shadow-md"><Globe2 className="h-8 w-8 text-kelo-primary"/><h3 className="mt-4 text-xl font-black">Joueur aléatoire</h3><p className="mt-2 text-sm text-kelo-muted">Trouve quelqu'un connecté à Kelo.</p></button>
                </section>

                <section className="mt-5 rounded-[26px] border border-kelo-border bg-white p-5"><h3 className="font-black">Rejoindre une partie ami</h3><div className="mt-3 flex gap-2"><input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="CODE" maxLength={8} className="min-w-0 flex-1 rounded-xl border border-kelo-border px-4 py-3 font-bold uppercase"/><button onClick={joinFriend} className="rounded-xl bg-kelo-text px-5 font-bold text-white">Rejoindre</button></div>{room && <div className="mt-4 rounded-xl bg-kelo-background p-4"><p className="text-sm text-kelo-muted">Code</p><div className="flex items-center gap-3"><span className="text-2xl font-black tracking-widest">{room.id}</span><button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/games/cards?room=${room.id}`)}><Copy className="h-4 w-4"/></button></div></div>}{status && <p className="mt-3 text-sm font-semibold text-kelo-muted">{status}</p>}</section>
              </>
            )}

            {game && (
              <section>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-kelo-muted">{mode === "robot" ? "Kelo Bot" : room?.players[opponentIndex]?.handle ? `@${room.players[opponentIndex].handle}` : "Adversaire"}</p><p className="text-3xl font-black">{game.scores[opponentIndex]} pts</p></div><div className="rounded-2xl bg-white px-5 py-3 text-center shadow-sm"><p className="text-xs text-kelo-muted">Tour</p><p className="font-black">{myTurn ? "À toi" : "Adversaire"}</p></div><div className="text-right"><p className="text-sm font-bold text-kelo-muted">@{handle}</p><p className="text-3xl font-black">{game.scores[myIndex]} pts</p></div></div>

                <div className="grid gap-4 md:grid-cols-3">{game.lanes.map((lane, laneIndex) => <button key={laneIndex} disabled={!myTurn || selectedCard === null} onClick={() => playToLane(laneIndex)} className="min-h-56 rounded-[28px] border border-kelo-border bg-white p-5 text-left shadow-sm disabled:cursor-default"><div className="flex items-center justify-between"><span className={`rounded-full bg-gradient-to-r ${colorClass(lane.affinity)} px-3 py-1 text-xs font-black text-white`}>Voie {lane.affinity}</span><span className="text-xs text-kelo-muted">{lane.cards.length} cartes</span></div><div className="mt-6 flex min-h-28 items-center justify-center">{lane.cards.length ? <CardFace card={lane.cards[lane.cards.length - 1]}/> : <span className="text-sm font-bold text-kelo-muted">Choisis une carte puis cette voie</span>}</div></button>)}</div>

                <div className="mt-6 rounded-[28px] border border-kelo-border bg-white p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-black">Ta main</h3><span className="text-sm text-kelo-muted">{game.hands[myIndex].length} cartes · adversaire {game.hands[opponentIndex].length}</span></div><div className="flex flex-wrap gap-3">{game.hands[myIndex].map((card, index) => <button key={card.id} disabled={!myTurn} onClick={() => setSelectedCard(index)} className={`rounded-2xl transition ${selectedCard === index ? "-translate-y-2 ring-4 ring-kelo-primary/25" : ""}`}><CardFace card={card}/></button>)}</div></div>

                {game.finished && <div className="mt-6 rounded-[28px] bg-white p-7 text-center shadow-xl"><Trophy className="mx-auto h-10 w-10 text-kelo-primary"/><h2 className="mt-3 text-3xl font-black">{game.winner === -1 ? "Égalité !" : game.winner === myIndex ? "Victoire !" : "Partie perdue"}</h2><p className="mt-2 text-kelo-muted">Score final : {game.scores[myIndex]} – {game.scores[opponentIndex]}</p><button onClick={() => { setGame(null); setRoom(null); setSelectedCard(null); }} className="mt-5 inline-flex items-center gap-2 rounded-full bg-kelo-gradient px-6 py-3 font-black text-white"><RefreshCcw className="h-4 w-4"/>Nouvelle partie</button></div>}
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function CardFace({ card }: { card: Card }) {
  return <div className={`h-32 w-24 rounded-2xl bg-gradient-to-br ${colorClass(card.color)} p-3 text-white shadow-lg`}><div className="text-xs font-black uppercase">{card.color}</div><div className="mt-3 text-4xl font-black">{card.value}</div><div className="mt-2 text-[10px] font-bold uppercase">{card.power === "pulse" ? "Pulse ×2" : card.power === "shift" ? "Shift" : card.power === "link" ? "Link +4" : "Kelo"}</div></div>;
}
