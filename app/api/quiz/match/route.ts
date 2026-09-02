import { NextRequest, NextResponse } from "next/server";

type Player = {
  id: string;
  handle: string;
  score: number;
  finished: boolean;
};

type Room = {
  id: string;
  mode: "friend" | "online";
  seed: string;
  themes: string[];
  createdAt: number;
  startedAt?: number;
  players: Player[];
};

type Store = {
  rooms: Map<string, Room>;
  queue: string[];
};

declare global {
  // eslint-disable-next-line no-var
  var __keloQuizStore: Store | undefined;
}

const store: Store = globalThis.__keloQuizStore ?? {
  rooms: new Map<string, Room>(),
  queue: [],
};

globalThis.__keloQuizStore = store;

function randomCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let output = "";
  for (let i = 0; i < length; i += 1) output += alphabet[Math.floor(Math.random() * alphabet.length)];
  return output;
}

function cleanOldRooms() {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, room] of store.rooms.entries()) {
    if (room.createdAt < cutoff) store.rooms.delete(id);
  }
  store.queue = store.queue.filter((id) => store.rooms.has(id));
}

function publicRoom(room: Room) {
  return {
    id: room.id,
    mode: room.mode,
    seed: room.seed,
    themes: room.themes,
    started: !!room.startedAt,
    players: room.players,
  };
}

export async function GET(request: NextRequest) {
  cleanOldRooms();
  const roomId = request.nextUrl.searchParams.get("room")?.toUpperCase();
  if (!roomId) return NextResponse.json({ error: "room_required" }, { status: 400 });
  const room = store.rooms.get(roomId);
  if (!room) return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  return NextResponse.json(publicRoom(room));
}

export async function POST(request: NextRequest) {
  cleanOldRooms();
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const handle = String(body.handle || "Joueur").slice(0, 80);
  const playerId = String(body.playerId || crypto.randomUUID());
  const themes = Array.isArray(body.themes) ? body.themes.map(String).slice(0, 20) : [];

  if (action === "create_friend") {
    let roomId = randomCode();
    while (store.rooms.has(roomId)) roomId = randomCode();
    const room: Room = {
      id: roomId,
      mode: "friend",
      seed: `friend:${roomId}:${Date.now()}`,
      themes,
      createdAt: Date.now(),
      players: [{ id: playerId, handle, score: 0, finished: false }],
    };
    store.rooms.set(roomId, room);
    return NextResponse.json({ room: publicRoom(room), playerId });
  }

  if (action === "join_friend") {
    const roomId = String(body.room || "").trim().toUpperCase();
    const room = store.rooms.get(roomId);
    if (!room || room.mode !== "friend") return NextResponse.json({ error: "room_not_found" }, { status: 404 });
    if (!room.players.some((player) => player.id === playerId) && room.players.length < 8) {
      room.players.push({ id: playerId, handle, score: 0, finished: false });
    }
    if (room.players.length >= 2 && !room.startedAt) room.startedAt = Date.now();
    return NextResponse.json({ room: publicRoom(room), playerId });
  }

  if (action === "find_online") {
    let room = store.queue.map((id) => store.rooms.get(id)).find((candidate) => candidate && candidate.mode === "online" && candidate.players.length < 4);
    if (!room) {
      let roomId = randomCode(8);
      while (store.rooms.has(roomId)) roomId = randomCode(8);
      room = {
        id: roomId,
        mode: "online",
        seed: `online:${roomId}:${Date.now()}`,
        themes,
        createdAt: Date.now(),
        players: [{ id: playerId, handle, score: 0, finished: false }],
      };
      store.rooms.set(roomId, room);
      store.queue.push(roomId);
    } else if (!room.players.some((player) => player.id === playerId)) {
      room.players.push({ id: playerId, handle, score: 0, finished: false });
    }
    if (room.players.length >= 2 && !room.startedAt) room.startedAt = Date.now();
    if (room.players.length >= 4) store.queue = store.queue.filter((id) => id !== room!.id);
    return NextResponse.json({ room: publicRoom(room), playerId });
  }

  if (action === "submit_score") {
    const roomId = String(body.room || "").trim().toUpperCase();
    const room = store.rooms.get(roomId);
    if (!room) return NextResponse.json({ error: "room_not_found" }, { status: 404 });
    const player = room.players.find((item) => item.id === playerId);
    if (!player) return NextResponse.json({ error: "player_not_found" }, { status: 404 });
    player.score = Math.max(0, Math.min(50000, Number(body.score) || 0));
    player.finished = true;
    return NextResponse.json({ room: publicRoom(room), playerId });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
