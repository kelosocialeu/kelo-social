import { NextRequest, NextResponse } from "next/server";

type GameKind = "cards" | "chess";
type RoomMode = "friend" | "online" | "tournament";

type Player = {
  id: string;
  handle: string;
  rating: number;
};

type GameRoom = {
  id: string;
  game: GameKind;
  mode: RoomMode;
  createdAt: number;
  updatedAt: number;
  players: Player[];
  state: unknown;
  started: boolean;
  finished: boolean;
  winnerId?: string;
};

type RankingEntry = {
  handle: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
};

type Store = {
  rooms: Map<string, GameRoom>;
  queues: Record<string, string[]>;
  rankings: Map<string, RankingEntry>;
};

declare global {
  // eslint-disable-next-line no-var
  var __keloGameRoomStore: Store | undefined;
}

const store: Store = globalThis.__keloGameRoomStore ?? {
  rooms: new Map<string, GameRoom>(),
  queues: {},
  rankings: new Map<string, RankingEntry>(),
};

globalThis.__keloGameRoomStore = store;

function code(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let output = "";
  for (let i = 0; i < length; i += 1) output += chars[Math.floor(Math.random() * chars.length)];
  return output;
}

function cleanup() {
  const cutoff = Date.now() - 3 * 60 * 60 * 1000;
  store.rooms.forEach((room, id) => {
    if (room.updatedAt < cutoff) store.rooms.delete(id);
  });
  Object.keys(store.queues).forEach((key) => {
    store.queues[key] = store.queues[key].filter((id) => store.rooms.has(id));
  });
}

function publicRoom(room: GameRoom) {
  return {
    id: room.id,
    game: room.game,
    mode: room.mode,
    players: room.players,
    state: room.state,
    started: room.started,
    finished: room.finished,
    winnerId: room.winnerId,
    updatedAt: room.updatedAt,
  };
}

function playerFromBody(body: any): Player {
  return {
    id: String(body.playerId || crypto.randomUUID()),
    handle: String(body.handle || "Joueur").slice(0, 80),
    rating: Math.max(100, Math.min(3000, Number(body.rating) || 1200)),
  };
}

function queueKey(game: GameKind, mode: RoomMode) {
  return `${game}:${mode}`;
}

function getRanking(game: GameKind) {
  const prefix = `${game}:`;
  const rows: RankingEntry[] = [];
  store.rankings.forEach((entry, key) => {
    if (key.startsWith(prefix)) rows.push(entry);
  });
  return rows.sort((a, b) => b.rating - a.rating).slice(0, 50);
}

function recordResult(game: GameKind, winnerHandle: string, loserHandle: string, draw = false) {
  const update = (handle: string, won: boolean) => {
    const key = `${game}:${handle.toLowerCase()}`;
    const current = store.rankings.get(key) || { handle, rating: 1200, wins: 0, losses: 0, draws: 0 };
    if (draw) {
      current.draws += 1;
    } else if (won) {
      current.wins += 1;
      current.rating = Math.min(3000, current.rating + 16);
    } else {
      current.losses += 1;
      current.rating = Math.max(100, current.rating - 16);
    }
    store.rankings.set(key, current);
  };
  update(winnerHandle, true);
  update(loserHandle, false);
}

export async function GET(request: NextRequest) {
  cleanup();
  const rankingGame = request.nextUrl.searchParams.get("ranking") as GameKind | null;
  if (rankingGame === "cards" || rankingGame === "chess") {
    return NextResponse.json({ ranking: getRanking(rankingGame) });
  }
  const roomId = request.nextUrl.searchParams.get("room")?.toUpperCase();
  if (!roomId) return NextResponse.json({ error: "room_required" }, { status: 400 });
  const room = store.rooms.get(roomId);
  if (!room) return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  return NextResponse.json({ room: publicRoom(room) });
}

export async function POST(request: NextRequest) {
  cleanup();
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const game = String(body.game || "") as GameKind;
  if (game !== "cards" && game !== "chess") return NextResponse.json({ error: "invalid_game" }, { status: 400 });
  const player = playerFromBody(body);

  if (action === "create") {
    const mode: RoomMode = "friend";
    let roomId = code();
    while (store.rooms.has(roomId)) roomId = code();
    const room: GameRoom = { id: roomId, game, mode, createdAt: Date.now(), updatedAt: Date.now(), players: [player], state: body.state ?? null, started: false, finished: false };
    store.rooms.set(roomId, room);
    return NextResponse.json({ room: publicRoom(room), playerId: player.id });
  }

  if (action === "join") {
    const roomId = String(body.room || "").trim().toUpperCase();
    const room = store.rooms.get(roomId);
    if (!room || room.game !== game) return NextResponse.json({ error: "room_not_found" }, { status: 404 });
    if (!room.players.some((item) => item.id === player.id) && room.players.length < 2) room.players.push(player);
    room.started = room.players.length >= 2;
    room.updatedAt = Date.now();
    return NextResponse.json({ room: publicRoom(room), playerId: player.id });
  }

  if (action === "find") {
    const mode: RoomMode = body.tournament ? "tournament" : "online";
    const key = queueKey(game, mode);
    const queue = store.queues[key] || [];
    let room = queue.map((id) => store.rooms.get(id)).find((candidate) => candidate && !candidate.started && !candidate.finished && candidate.players.length < 2);
    if (!room) {
      let roomId = code(8);
      while (store.rooms.has(roomId)) roomId = code(8);
      room = { id: roomId, game, mode, createdAt: Date.now(), updatedAt: Date.now(), players: [player], state: body.state ?? null, started: false, finished: false };
      store.rooms.set(roomId, room);
      store.queues[key] = [...queue, roomId];
    } else if (!room.players.some((item) => item.id === player.id)) {
      room.players.push(player);
      room.started = true;
      room.updatedAt = Date.now();
      store.queues[key] = queue.filter((id) => id !== room!.id);
    }
    return NextResponse.json({ room: publicRoom(room), playerId: player.id });
  }

  if (action === "state") {
    const roomId = String(body.room || "").trim().toUpperCase();
    const room = store.rooms.get(roomId);
    if (!room || room.game !== game) return NextResponse.json({ error: "room_not_found" }, { status: 404 });
    if (!room.players.some((item) => item.id === player.id)) return NextResponse.json({ error: "player_not_found" }, { status: 403 });
    room.state = body.state ?? room.state;
    room.updatedAt = Date.now();
    return NextResponse.json({ room: publicRoom(room), playerId: player.id });
  }

  if (action === "finish") {
    const roomId = String(body.room || "").trim().toUpperCase();
    const room = store.rooms.get(roomId);
    if (!room || room.game !== game) return NextResponse.json({ error: "room_not_found" }, { status: 404 });
    room.finished = true;
    room.winnerId = body.winnerId ? String(body.winnerId) : undefined;
    room.updatedAt = Date.now();
    if (room.mode === "tournament" && room.players.length === 2) {
      const winner = room.players.find((item) => item.id === room.winnerId);
      const loser = room.players.find((item) => item.id !== room.winnerId);
      if (winner && loser) recordResult(game, winner.handle, loser.handle, false);
    }
    return NextResponse.json({ room: publicRoom(room), ranking: getRanking(game), playerId: player.id });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
