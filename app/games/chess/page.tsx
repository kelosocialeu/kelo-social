"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Copy, Crown, Globe2, Medal, RefreshCcw, Swords, Trophy, UsersRound } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type Color = "w" | "b";
type PieceType = "P" | "N" | "B" | "R" | "Q" | "K";
type Piece = `${Color}${PieceType}`;
type Move = { from: number; to: number; promotion?: PieceType; castle?: "k" | "q"; enPassant?: boolean };
type ChessState = {
  board: (Piece | null)[];
  turn: Color;
  castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  enPassant: number | null;
  halfmove: number;
  fullmove: number;
  lastMove: Move | null;
  result: "playing" | "white" | "black" | "draw";
};
type Room = { id: string; players: { id: string; handle: string; rating: number }[]; state: ChessState | null; started: boolean; finished: boolean; winnerId?: string };
type Mode = "robot" | "friend" | "tournament";
type Ranking = { handle: string; rating: number; wins: number; losses: number; draws: number };

const PIECE_GLYPH: Record<Piece, string> = { wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙", bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟" };
const VALUES: Record<PieceType, number> = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

function initialState(): ChessState {
  const board: (Piece | null)[] = Array(64).fill(null);
  const back: PieceType[] = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  for (let col = 0; col < 8; col += 1) {
    board[col] = `b${back[col]}` as Piece;
    board[8 + col] = "bP";
    board[48 + col] = "wP";
    board[56 + col] = `w${back[col]}` as Piece;
  }
  return { board, turn: "w", castling: { wK: true, wQ: true, bK: true, bQ: true }, enPassant: null, halfmove: 0, fullmove: 1, lastMove: null, result: "playing" };
}

function rowOf(index: number) { return Math.floor(index / 8); }
function colOf(index: number) { return index % 8; }
function indexOf(row: number, col: number) { return row * 8 + col; }
function inside(row: number, col: number) { return row >= 0 && row < 8 && col >= 0 && col < 8; }
function opposite(color: Color): Color { return color === "w" ? "b" : "w"; }
function pieceColor(piece: Piece | null): Color | null { return piece ? piece[0] as Color : null; }
function pieceType(piece: Piece): PieceType { return piece[1] as PieceType; }

function pseudoMoves(state: ChessState, from: number, attacksOnly = false): Move[] {
  const board = state.board;
  const piece = board[from];
  if (!piece) return [];
  const color = pieceColor(piece)!;
  const type = pieceType(piece);
  const row = rowOf(from); const col = colOf(from);
  const moves: Move[] = [];
  const add = (r: number, c: number) => {
    if (!inside(r, c)) return false;
    const to = indexOf(r, c); const target = board[to];
    if (!target) { moves.push({ from, to }); return true; }
    if (pieceColor(target) !== color) moves.push({ from, to });
    return false;
  };

  if (type === "P") {
    const dir = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;
    const promotionRow = color === "w" ? 0 : 7;
    for (const dc of [-1, 1]) {
      const r = row + dir; const c = col + dc;
      if (!inside(r, c)) continue;
      const to = indexOf(r, c);
      if (attacksOnly) moves.push({ from, to });
      else if ((board[to] && pieceColor(board[to]) !== color) || state.enPassant === to) moves.push({ from, to, promotion: r === promotionRow ? "Q" : undefined, enPassant: state.enPassant === to && !board[to] });
    }
    if (!attacksOnly) {
      const oneRow = row + dir;
      if (inside(oneRow, col) && !board[indexOf(oneRow, col)]) {
        moves.push({ from, to: indexOf(oneRow, col), promotion: oneRow === promotionRow ? "Q" : undefined });
        const twoRow = row + dir * 2;
        if (row === startRow && !board[indexOf(twoRow, col)]) moves.push({ from, to: indexOf(twoRow, col) });
      }
    }
  } else if (type === "N") {
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr, dc]) => add(row + dr, col + dc));
  } else if (type === "B" || type === "R" || type === "Q") {
    const directions: number[][] = [];
    if (type === "B" || type === "Q") directions.push([-1,-1],[-1,1],[1,-1],[1,1]);
    if (type === "R" || type === "Q") directions.push([-1,0],[1,0],[0,-1],[0,1]);
    directions.forEach(([dr, dc]) => { let r = row + dr; let c = col + dc; while (inside(r, c)) { if (!add(r, c)) break; r += dr; c += dc; } });
  } else if (type === "K") {
    for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) if (dr || dc) add(row + dr, col + dc);
    if (!attacksOnly) {
      const enemy = opposite(color);
      const kingSide = color === "w" ? state.castling.wK : state.castling.bK;
      const queenSide = color === "w" ? state.castling.wQ : state.castling.bQ;
      if (kingSide && !board[from + 1] && !board[from + 2] && !isSquareAttacked(state, from, enemy) && !isSquareAttacked(state, from + 1, enemy) && !isSquareAttacked(state, from + 2, enemy)) moves.push({ from, to: from + 2, castle: "k" });
      if (queenSide && !board[from - 1] && !board[from - 2] && !board[from - 3] && !isSquareAttacked(state, from, enemy) && !isSquareAttacked(state, from - 1, enemy) && !isSquareAttacked(state, from - 2, enemy)) moves.push({ from, to: from - 2, castle: "q" });
    }
  }
  return moves;
}

function isSquareAttacked(state: ChessState, square: number, byColor: Color) {
  for (let i = 0; i < 64; i += 1) {
    const piece = state.board[i];
    if (!piece || pieceColor(piece) !== byColor) continue;
    if (pseudoMoves(state, i, true).some((move) => move.to === square)) return true;
  }
  return false;
}

function kingIndex(state: ChessState, color: Color) { return state.board.findIndex((piece) => piece === `${color}K`); }
function inCheck(state: ChessState, color: Color) { const king = kingIndex(state, color); return king >= 0 && isSquareAttacked(state, king, opposite(color)); }

function applyUnchecked(state: ChessState, move: Move): ChessState {
  const next: ChessState = JSON.parse(JSON.stringify(state));
  const piece = next.board[move.from] as Piece;
  const color = pieceColor(piece)!;
  const type = pieceType(piece);
  const captured = next.board[move.to];
  next.board[move.from] = null;
  next.board[move.to] = move.promotion ? `${color}${move.promotion}` as Piece : piece;
  if (move.enPassant) next.board[move.to + (color === "w" ? 8 : -8)] = null;
  if (move.castle === "k") { next.board[move.to - 1] = next.board[move.to + 1]; next.board[move.to + 1] = null; }
  if (move.castle === "q") { next.board[move.to + 1] = next.board[move.to - 2]; next.board[move.to - 2] = null; }

  if (piece === "wK") { next.castling.wK = false; next.castling.wQ = false; }
  if (piece === "bK") { next.castling.bK = false; next.castling.bQ = false; }
  if (move.from === 63 || move.to === 63) next.castling.wK = false;
  if (move.from === 56 || move.to === 56) next.castling.wQ = false;
  if (move.from === 7 || move.to === 7) next.castling.bK = false;
  if (move.from === 0 || move.to === 0) next.castling.bQ = false;

  next.enPassant = type === "P" && Math.abs(move.to - move.from) === 16 ? (move.from + move.to) / 2 : null;
  next.halfmove = type === "P" || captured ? 0 : next.halfmove + 1;
  if (color === "b") next.fullmove += 1;
  next.turn = opposite(color);
  next.lastMove = move;
  return next;
}

function legalMoves(state: ChessState, color = state.turn): Move[] {
  const moves: Move[] = [];
  for (let i = 0; i < 64; i += 1) {
    const piece = state.board[i];
    if (!piece || pieceColor(piece) !== color) continue;
    pseudoMoves(state, i).forEach((move) => {
      const next = applyUnchecked(state, move);
      if (!inCheck(next, color)) moves.push(move);
    });
  }
  return moves;
}

function applyMove(state: ChessState, move: Move): ChessState {
  const next = applyUnchecked(state, move);
  const replies = legalMoves(next, next.turn);
  if (replies.length === 0) next.result = inCheck(next, next.turn) ? (next.turn === "w" ? "black" : "white") : "draw";
  else if (next.halfmove >= 100) next.result = "draw";
  return next;
}

function evaluate(state: ChessState) {
  if (state.result === "white") return 100000;
  if (state.result === "black") return -100000;
  if (state.result === "draw") return 0;
  let score = 0;
  state.board.forEach((piece) => { if (piece) score += (pieceColor(piece) === "w" ? 1 : -1) * VALUES[pieceType(piece)]; });
  return score;
}

function robotMove(state: ChessState): Move | null {
  const moves = legalMoves(state, "b");
  if (!moves.length) return null;
  let bestMove = moves[0]; let bestScore = Infinity;
  moves.forEach((move) => {
    const after = applyMove(state, move);
    const replies = legalMoves(after, "w");
    let replyScore = evaluate(after);
    if (replies.length) replyScore = Math.max.apply(null, replies.slice(0, 24).map((reply) => evaluate(applyMove(after, reply))));
    if (replyScore < bestScore) { bestScore = replyScore; bestMove = move; }
  });
  return bestMove;
}

function squareName(index: number) { return `${"abcdefgh"[colOf(index)]}${8 - rowOf(index)}`; }

export default function KeloChessPage() {
  const { checked, handle } = useRequireAuth();
  const [mode, setMode] = useState<Mode>("robot");
  const [game, setGame] = useState<ChessState | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [status, setStatus] = useState("");
  const [rating, setRating] = useState(1200);
  const [ranking, setRanking] = useState<Ranking[]>([]);

  useEffect(() => { setRating(Number(localStorage.getItem("kelo.chess.rating") || 1200)); }, []);
  const logout = () => { localStorage.clear(); window.location.href = "/login"; };
  const playerIndex = useMemo(() => room?.players[1]?.id === playerId ? 1 : 0, [room, playerId]);
  const myColor: Color = mode === "robot" ? "w" : playerIndex === 0 ? "w" : "b";

  const callRoom = async (action: string, extra: Record<string, unknown> = {}) => {
    const response = await fetch("/api/games/room", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, game: "chess", handle, playerId: playerId || undefined, rating, ...extra }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "network_error");
    if (data.playerId) setPlayerId(data.playerId);
    if (data.room) setRoom(data.room);
    if (data.ranking) setRanking(data.ranking);
    return data;
  };

  const startRobot = () => { setMode("robot"); setRoom(null); setSelected(null); setGame(initialState()); setStatus(""); };
  const createFriend = async () => { try { setMode("friend"); const data = await callRoom("create"); setRoom(data.room); setGame(null); setStatus("En attente de ton ami"); } catch { setStatus("Impossible de créer la partie."); } };
  const joinFriend = async () => { if (!joinCode.trim()) return; try { setMode("friend"); const data = await callRoom("join", { room: joinCode.trim().toUpperCase() }); setRoom(data.room); setStatus("Partie rejointe"); } catch { setStatus("Code introuvable."); } };
  const findTournament = async () => { try { setMode("tournament"); setStatus("Recherche d'un adversaire classé…"); const data = await callRoom("find", { tournament: true }); setRoom(data.room); setGame(data.room.state || null); setStatus(data.room.started ? "Adversaire trouvé !" : "En attente d'un adversaire…"); } catch { setStatus("Tournoi indisponible."); } };

  useEffect(() => {
    fetch("/api/games/room?ranking=chess", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((data) => data?.ranking && setRanking(data.ranking)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!room || mode === "robot") return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/games/room?room=${encodeURIComponent(room.id)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json(); const nextRoom: Room = data.room; setRoom(nextRoom);
        if (nextRoom.started && !nextRoom.state && nextRoom.players[0]?.id === playerId) {
          const initial = initialState(); await callRoom("state", { room: nextRoom.id, state: initial }); setGame(initial);
        } else if (nextRoom.state) setGame(nextRoom.state);
      } catch { /* retry */ }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [room?.id, playerId, mode]);

  useEffect(() => {
    if (mode !== "robot" || !game || game.result !== "playing" || game.turn !== "b") return;
    const timer = window.setTimeout(() => { const move = robotMove(game); if (move) setGame(applyMove(game, move)); }, 450);
    return () => window.clearTimeout(timer);
  }, [game, mode]);

  const clickSquare = async (square: number) => {
    if (!game || game.result !== "playing" || game.turn !== myColor) return;
    const piece = game.board[square];
    if (selected === null) { if (piece && pieceColor(piece) === myColor) setSelected(square); return; }
    if (piece && pieceColor(piece) === myColor) { setSelected(square); return; }
    const move = legalMoves(game, myColor).find((candidate) => candidate.from === selected && candidate.to === square);
    if (!move) { setSelected(null); return; }
    const next = applyMove(game, move); setSelected(null); setGame(next);
    if (mode !== "robot" && room) {
      try {
        await callRoom("state", { room: room.id, state: next });
        if (next.result !== "playing") {
          let winnerId: string | undefined;
          if (next.result === "white") winnerId = room.players[0]?.id;
          if (next.result === "black") winnerId = room.players[1]?.id;
          if (winnerId) {
            const data = await callRoom("finish", { room: room.id, winnerId });
            if (mode === "tournament") {
              const won = winnerId === playerId; const nextRating = Math.max(100, rating + (won ? 16 : -16)); setRating(nextRating); localStorage.setItem("kelo.chess.rating", String(nextRating)); if (data.ranking) setRanking(data.ranking);
            }
          }
        }
      } catch { setStatus("Synchronisation momentanément interrompue."); }
    }
  };

  if (!checked) return <div className="flex min-h-screen items-center justify-center bg-kelo-background">Chargement…</div>;
  const available = game && selected !== null ? legalMoves(game, myColor).filter((move) => move.from === selected).map((move) => move.to) : [];
  const orientation = myColor === "w" ? [...Array(64).keys()] : [...Array(64).keys()].reverse();
  const opponent = mode === "robot" ? "Kelo Bot" : room?.players[playerIndex === 0 ? 1 : 0]?.handle ? `@${room.players[playerIndex === 0 ? 1 : 0].handle}` : "Adversaire";

  return <div className="min-h-screen bg-kelo-background text-kelo-text"><div className="flex min-h-screen"><Sidebar handle={handle} onLogout={logout}/><main className="min-w-0 flex-1 pb-24"><header className="border-b border-kelo-border bg-white/90 px-4 py-4 backdrop-blur-xl md:px-8"><div className="mx-auto flex max-w-7xl items-center gap-3"><Link href="/games" className="rounded-xl bg-kelo-background p-2"><ArrowLeft className="h-5 w-5"/></Link><Crown className="h-7 w-7 text-kelo-primary"/><div><h1 className="text-2xl font-black">Kelo Échecs</h1><p className="text-sm text-kelo-muted">Échecs classiques : robot, amis et parties classées.</p></div></div></header>

  <div className="mx-auto max-w-7xl p-4 md:p-8">{!game && <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><div><section className="rounded-[32px] bg-kelo-gradient p-7 text-white shadow-xl md:p-10"><span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">♟ Kelo Échecs</span><h2 className="mt-4 text-4xl font-black">Le jeu d'échecs par excellence, directement dans Kelo.</h2><p className="mt-3 max-w-3xl text-white/85">Règles classiques avec échec, échec et mat, pat, promotion, roque et prise en passant. Choisis ton adversaire et grimpe dans le classement Kelo.</p></section><section className="mt-6 grid gap-4 md:grid-cols-3"><button onClick={startRobot} className="rounded-[26px] border border-kelo-border bg-white p-6 text-left shadow-sm"><Bot className="h-8 w-8 text-kelo-primary"/><h3 className="mt-4 text-xl font-black">Contre le robot</h3><p className="mt-2 text-sm text-kelo-muted">Partie immédiate contre Kelo Bot.</p></button><button onClick={createFriend} className="rounded-[26px] border border-kelo-border bg-white p-6 text-left shadow-sm"><UsersRound className="h-8 w-8 text-kelo-primary"/><h3 className="mt-4 text-xl font-black">Contre un ami</h3><p className="mt-2 text-sm text-kelo-muted">Crée une salle privée avec un code.</p></button><button onClick={findTournament} className="rounded-[26px] border border-kelo-border bg-white p-6 text-left shadow-sm"><Swords className="h-8 w-8 text-kelo-primary"/><h3 className="mt-4 text-xl font-black">Tournoi classé</h3><p className="mt-2 text-sm text-kelo-muted">Un adversaire aléatoire et des points de classement.</p></button></section><section className="mt-5 rounded-[26px] border border-kelo-border bg-white p-5"><div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><p className="mb-2 font-black">Rejoindre un ami</p><input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={8} placeholder="CODE" className="w-full rounded-xl border border-kelo-border px-4 py-3 font-bold uppercase"/></div><button onClick={joinFriend} className="rounded-xl bg-kelo-text px-5 py-3 font-bold text-white">Rejoindre</button></div>{room && <div className="mt-4 rounded-xl bg-kelo-background p-4"><p className="text-xs text-kelo-muted">Code de la salle</p><div className="mt-1 flex items-center gap-3"><span className="text-2xl font-black tracking-widest">{room.id}</span><button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/games/chess?room=${room.id}`)}><Copy className="h-4 w-4"/></button></div></div>}{status && <p className="mt-3 text-sm font-semibold text-kelo-muted">{status}</p>}</section></div><RankingPanel ranking={ranking} rating={rating}/></div>}

  {game && <div className="grid gap-6 xl:grid-cols-[minmax(0,760px)_360px]"><section><div className="mb-4 flex items-center justify-between"><div><p className="text-sm text-kelo-muted">Adversaire</p><p className="font-black">{opponent}</p></div><div className="rounded-2xl bg-white px-4 py-2 text-center shadow-sm"><p className="text-xs text-kelo-muted">Trait</p><p className="font-black">{game.turn === myColor ? "À toi" : "Adversaire"}</p></div><div className="text-right"><p className="text-sm text-kelo-muted">Toi</p><p className="font-black">@{handle}</p></div></div><div className="aspect-square w-full max-w-[760px] overflow-hidden rounded-[24px] border-4 border-white shadow-2xl"><div className="grid h-full grid-cols-8">{orientation.map((square) => { const piece = game.board[square]; const dark = (rowOf(square) + colOf(square)) % 2 === 1; const active = selected === square; const target = available.includes(square); const last = game.lastMove && (game.lastMove.from === square || game.lastMove.to === square); return <button key={square} onClick={() => clickSquare(square)} aria-label={`${squareName(square)} ${piece || "vide"}`} className={`relative flex items-center justify-center text-[8vw] leading-none sm:text-6xl ${dark ? "bg-[#8f69b5]" : "bg-[#f1e7fb]"} ${active ? "ring-4 ring-inset ring-yellow-400" : ""} ${last ? "after:absolute after:inset-0 after:bg-yellow-300/25" : ""}`}><span className="relative z-10 drop-shadow-sm">{piece ? PIECE_GLYPH[piece] : ""}</span>{target && <span className="absolute z-20 h-4 w-4 rounded-full bg-black/25 sm:h-5 sm:w-5"/>}<span className="absolute bottom-0.5 left-1 z-20 text-[9px] font-bold text-black/45">{squareName(square)}</span></button>; })}</div></div>{game.result !== "playing" && <div className="mt-5 rounded-[28px] bg-white p-6 text-center shadow-xl"><Trophy className="mx-auto h-9 w-9 text-kelo-primary"/><h2 className="mt-2 text-3xl font-black">{game.result === "draw" ? "Partie nulle" : (game.result === "white" ? "w" : "b") === myColor ? "Victoire !" : "Défaite"}</h2><button onClick={() => { setGame(null); setRoom(null); setSelected(null); }} className="mt-4 inline-flex items-center gap-2 rounded-full bg-kelo-gradient px-6 py-3 font-black text-white"><RefreshCcw className="h-4 w-4"/>Nouvelle partie</button></div>}</section><div><div className="rounded-[26px] border border-kelo-border bg-white p-5"><h3 className="font-black">État de la partie</h3><p className="mt-3 text-sm text-kelo-muted">{inCheck(game, game.turn) ? `⚠️ ${game.turn === "w" ? "Blancs" : "Noirs"} en échec` : "Aucun roi en échec"}</p><p className="mt-2 text-sm text-kelo-muted">Coup {game.fullmove} · {legalMoves(game).length} coups légaux</p></div>{mode === "tournament" && <div className="mt-5"><RankingPanel ranking={ranking} rating={rating}/></div>}</div></div>}</div></main></div></div>;
}

function RankingPanel({ ranking, rating }: { ranking: Ranking[]; rating: number }) {
  return <aside className="rounded-[28px] border border-kelo-border bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Medal className="h-5 w-5 text-kelo-primary"/><h3 className="text-lg font-black">Classement Kelo Échecs</h3></div><div className="mt-3 rounded-xl bg-kelo-background p-3"><p className="text-xs text-kelo-muted">Ton rating</p><p className="text-2xl font-black">{rating}</p></div><div className="mt-4 space-y-2">{ranking.length ? ranking.slice(0, 10).map((entry, index) => <div key={`${entry.handle}-${index}`} className="flex items-center justify-between rounded-xl bg-kelo-background px-3 py-2"><span className="text-sm font-bold">#{index + 1} @{entry.handle}</span><span className="font-black">{entry.rating}</span></div>) : <p className="py-5 text-center text-sm text-kelo-muted">Le classement se remplira avec les premières parties classées.</p>}</div></aside>;
}
