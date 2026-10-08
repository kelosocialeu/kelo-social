import { NextResponse } from "next/server";
import { createAccessToken } from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const MAX_MESSAGES = 24;

type AgentMessage = {
  role: "user" | "assistant";
  content: string;
};

function baseUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "L'agent IA Kelo Social n'est pas encore configuré (GROQ_API_KEY manquante)." }, { status: 503 });
  }

  let body: { messages?: AgentMessage[]; accessToken?: string; did?: string; handle?: string; pdsUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête IA invalide." }, { status: 400 });
  }

  const accessToken = String(body.accessToken || "").trim();
  const did = String(body.did || "").trim();
  const handle = String(body.handle || "").trim();
  const pdsUrl = String(body.pdsUrl || "").trim();
  const messages = Array.isArray(body.messages)
    ? body.messages
        .filter((message) => (message?.role === "user" || message?.role === "assistant") && typeof message.content === "string")
        .slice(-MAX_MESSAGES)
        .map((message) => ({ role: message.role, content: message.content.slice(0, 6000) }))
    : [];

  if (!accessToken || !did || !handle || !pdsUrl || messages.length === 0) {
    return NextResponse.json({ error: "Session utilisateur ou message manquant." }, { status: 400 });
  }

  const response = await fetch("https://api.groq.com/openai/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      instructions: [
        "Tu es l'agent IA intégré de Kelo Social.",
        "Tu peux agir directement sur le compte AT Protocol de l'utilisateur grâce aux outils MCP Kelo Social.",
        "Utilise les outils dès qu'une action sur Kelo Social est nécessaire. Ne prétends jamais avoir effectué une action si l'outil ne l'a pas confirmée.",
        "Respecte exactement l'intention de l'utilisateur et n'effectue pas d'action non demandée.",
        "Pour une publication, une réponse, un like, un repost ou un abonnement, utilise les outils appropriés.",
        "Pour supprimer une publication, vérifie qu'elle appartient au compte connecté et ne supprime rien d'autre.",
        "Réponds en français sauf si l'utilisateur écrit principalement dans une autre langue.",
      ].join("\n"),
      input: messages,
      tools: [
        {
          type: "mcp",
          server_label: "kelo_social",
          server_description: "Outils officiels Kelo Social. Ils permettent de lire le compte connecté et d'effectuer des actions AT Protocol au nom de cet utilisateur.",
          server_url: `${baseUrl(request)}/api/mcp`,
          headers: {
            Authorization: `Bearer ${createAccessToken({ did, handle, pdsUrl, accessJwt: accessToken, scope: "kelo:read kelo:write" })}`,
          },
          require_approval: "never",
        },
      ],
      parallel_tool_calls: false,
      temperature: 0.2,
    }),
    cache: "no-store",
  });

  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch {}

  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error?.message || data?.message || "Le service IA est temporairement indisponible." },
      { status: response.status >= 500 ? 502 : response.status },
    );
  }

  return NextResponse.json({
    text: data?.output_text || "Je n'ai pas reçu de réponse textuelle de l'agent.",
    responseId: data?.id || null,
    output: data?.output || [],
  });
}
