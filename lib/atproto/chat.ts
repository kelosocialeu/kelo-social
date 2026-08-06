import {
  getStoredSession,
  resumeAgentSession,
} from "@/services/auth.service";
import { getReadAgent } from "@/lib/atproto/read-agent";
import {
  requireIdentityVerification,
} from "@/lib/atproto/verification-guard";

const CHAT_PROXY_HEADER = {
  "atproto-proxy":
    "did:web:api.bsky.chat#bsky_chat",
};

async function getChatAgent() {
  const session = getStoredSession();

  if (!session) {
    throw new Error(
      "Vous devez être connecté pour accéder à vos messages."
    );
  }

  return resumeAgentSession(session);
}

export async function listConversations(
  limit = 30,
  cursor?: string
) {
  const agent = await getChatAgent();
  const response =
    await agent.api.chat.bsky.convo.listConvos(
      { limit, cursor },
      { headers: CHAT_PROXY_HEADER }
    );

  return {
    items: response.data.convos,
    cursor: response.data.cursor,
  };
}

export async function getOrCreateConversation(
  memberDid: string
) {
  await requireIdentityVerification();

  const agent = await getChatAgent();
  const response =
    await agent.api.chat.bsky.convo.getConvoForMembers(
      { members: [memberDid] },
      { headers: CHAT_PROXY_HEADER }
    );

  return response.data.convo;
}

export async function getConversationMessages(
  convoId: string,
  limit = 30,
  cursor?: string
) {
  const agent = await getChatAgent();
  const response =
    await agent.api.chat.bsky.convo.getMessages(
      { convoId, limit, cursor },
      { headers: CHAT_PROXY_HEADER }
    );

  return {
    items: response.data.messages,
    cursor: response.data.cursor,
  };
}

export async function sendConversationMessage(
  convoId: string,
  text: string
) {
  await requireIdentityVerification();

  const agent = await getChatAgent();
  const response =
    await agent.api.chat.bsky.convo.sendMessage(
      {
        convoId,
        message: { text },
      },
      {
        headers: CHAT_PROXY_HEADER,
        encoding: "application/json",
      }
    );

  return response.data;
}

/** La lecture reste autorisée avant vérification. */
export async function markConversationRead(
  convoId: string
) {
  const agent = await getChatAgent();

  await agent.api.chat.bsky.convo.updateRead(
    { convoId },
    {
      headers: CHAT_PROXY_HEADER,
      encoding: "application/json",
    }
  );
}

export async function resolveHandleToDid(
  handle: string
): Promise<string> {
  const agent = await getReadAgent();
  const response =
    await agent.api.com.atproto.identity.resolveHandle({
      handle,
    });

  return response.data.did;
}
