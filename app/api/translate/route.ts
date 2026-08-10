import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { text, target } = await request.json();
    if (typeof text !== "string" || !text.trim() || typeof target !== "string" || !target.trim()) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    const endpoint = process.env.KELO_TRANSLATE_URL;
    if (!endpoint) return NextResponse.json({ error: "Service de traduction non configuré" }, { status: 503 });
    const headers: Record<string,string> = { "content-type": "application/json" };
    if (process.env.KELO_TRANSLATE_API_KEY) headers.Authorization = `Bearer ${process.env.KELO_TRANSLATE_API_KEY}`;
    const upstream = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ q: text, source: "auto", target, format: "text" }), cache: "no-store" });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return NextResponse.json({ error: "Service de traduction indisponible" }, { status: 502 });
    const translation = data.translatedText || data.translation || data.text;
    if (typeof translation !== "string") return NextResponse.json({ error: "Réponse de traduction invalide" }, { status: 502 });
    return NextResponse.json({ translation });
  } catch (error) { console.error(error); return NextResponse.json({ error: "Erreur de traduction" }, { status: 500 }); }
}
