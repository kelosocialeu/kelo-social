import { getStoredSession, resumeAgentSession } from "@/services/auth.service";
import { getReadAgent } from "@/lib/atproto/read-agent";

/**
 * Les messages privés (DM) AT Protocol passent par un service dédié
 * ("bsky_chat"), distinct du PDS et de l'AppView classique. On l'indique
 * via l'en-tête atproto-proxy sur chaque appel — c'est la méthode standard
 * utilisée par Bluesky et les clients compatibles (@atproto/api l'expose
 * nativement via agent.api.chat.bsky.convo.*).
 */
const CHAT_PROXY_HEADER = { "atproto-proxy": "did:web:api.bsky.chat#bsky_chat" };

async function getChatAgent() {
  const session = getStoredSession();
  if (!session) throw new Error("Vous devez être connecté pour accéder à vos messages.");
  return resumeAgentSession(session);
}

export async function listConversations(limit = 30, cursor?: string) {
  const agent = await getChatAgent();
  const res = await agent.api.chat.bsky.convo.listConvos({ limit, cursor }, { headers: CHAT_PROXY_HEADER });
  return { items: res.data.convos, cursor: res.data.cursor };
}

export async function getOrCreateConversation(memberDid: string) {
  const agent = await getChatAgent();
  const res = await agent.api.chat.bsky.convo.getConvoForMembers(
    { members: [memberDid] },
    { headers: CHAT_PROXY_HEADER }
  );
  return res.data.convo;
}

export async function getConversationMessages(convoId: string, limit = 30, cursor?: string) {
  const agent = await getChatAgent();
  const res = await agent.api.chat.bsky.convo.getMessages(
    { convoId, limit, cursor },
    { headers: CHAT_PROXY_HEADER }
  );
  return { items: res.data.messages, cursor: res.data.cursor };
}

export async function sendConversationMessage(convoId: string, text: string) {
  const agent = await getChatAgent();
  const res = await agent.api.chat.bsky.convo.sendMessage(
    { convoId, message: { text } },
    { headers: CHAT_PROXY_HEADER, encoding: "application/json" }
  );
  return res.data;
}

export async function markConversationRead(convoId: string) {
  const agent = await getChatAgent();
  await agent.api.chat.bsky.convo.updateRead(
    { convoId },
    { headers: CHAT_PROXY_HEADER, encoding: "application/json" }
  );
}

/**
 * Résout un handle (quel que soit son PDS d'origine) vers son DID, pour
 * démarrer une nouvelle discussion.
 */
export async function resolveHandleToDid(handle: string): Promise<string> {
  const agent = await getReadAgent();
  const res = await agent.api.com.atproto.identity.resolveHandle({ handle });
  return res.data.did;
}
