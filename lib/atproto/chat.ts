import {
  getAuthenticatedAgent,
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

const CHAT_DECLARATION_COLLECTION = "chat.bsky.actor.declaration";
export const MAX_GROUP_PARTICIPANTS = 100;

export type ChatPermission = "all" | "following" | "none";

export type MessagingPreferences = {
  allowIncoming: ChatPermission;
  allowGroupInvites: ChatPermission;
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

export async function getConversation(
  convoId: string
) {
  const agent = await getChatAgent();
  const response = await agent.api.chat.bsky.convo.getConvo(
    { convoId },
    { headers: CHAT_PROXY_HEADER }
  );

  return response.data.convo;
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

export async function getOrCreateGroupConversation(
  memberDids: string[]
) {
  await requireIdentityVerification();

  const uniqueMembers = Array.from(
    new Set(memberDids.map((did) => did.trim()).filter(Boolean))
  );

  if (uniqueMembers.length < 2) {
    throw new Error("Un groupe doit contenir au moins 3 participants, vous compris.");
  }

  if (uniqueMembers.length > MAX_GROUP_PARTICIPANTS - 1) {
    throw new Error(
      `Un groupe Kelo Social peut contenir au maximum ${MAX_GROUP_PARTICIPANTS} participants, créateur compris.`
    );
  }

  const agent = await getChatAgent();
  const response =
    await agent.api.chat.bsky.convo.getConvoForMembers(
      { members: uniqueMembers },
      { headers: CHAT_PROXY_HEADER }
    );

  return response.data.convo;
}

export async function getConversationAvailability(
  memberDid: string
): Promise<{ canChat: boolean; convo?: any }> {
  const { session } = await getAuthenticatedAgent();
  const pds = session.pdsUrl.replace(/\/$/, "");
  const url = new URL(`${pds}/xrpc/chat.bsky.convo.getConvoAvailability`);
  url.searchParams.append("members", memberDid);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.accessJwt}`,
      Accept: "application/json",
      ...CHAT_PROXY_HEADER,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Impossible de vérifier la disponibilité de la messagerie.");
  }

  const data = await response.json();
  return {
    canChat: data?.canChat === true,
    convo: data?.convo,
  };
}

export async function getMessagingPreferences(): Promise<MessagingPreferences> {
  const { agent, session } = await getAuthenticatedAgent();

  try {
    const current = await agent.api.com.atproto.repo.getRecord({
      repo: session.did,
      collection: CHAT_DECLARATION_COLLECTION,
      rkey: "self",
    });
    const value = current.data.value as any;

    return {
      allowIncoming:
        value?.allowIncoming === "all" ||
        value?.allowIncoming === "none" ||
        value?.allowIncoming === "following"
          ? value.allowIncoming
          : "following",
      allowGroupInvites:
        value?.allowGroupInvites === "all" ||
        value?.allowGroupInvites === "none" ||
        value?.allowGroupInvites === "following"
          ? value.allowGroupInvites
          : "following",
    };
  } catch (error: any) {
    if (error?.status !== 404) throw error;
    return {
      allowIncoming: "following",
      allowGroupInvites: "following",
    };
  }
}

export async function setMessagingPreferences(
  preferences: MessagingPreferences
): Promise<void> {
  const { agent, session } = await getAuthenticatedAgent();

  let currentRecord: Record<string, unknown> = {
    $type: CHAT_DECLARATION_COLLECTION,
  };

  try {
    const current = await agent.api.com.atproto.repo.getRecord({
      repo: session.did,
      collection: CHAT_DECLARATION_COLLECTION,
      rkey: "self",
    });
    currentRecord = current.data.value as Record<string, unknown>;
  } catch (error: any) {
    if (error?.status !== 404) throw error;
  }

  await agent.api.com.atproto.repo.putRecord({
    repo: session.did,
    collection: CHAT_DECLARATION_COLLECTION,
    rkey: "self",
    record: {
      ...currentRecord,
      $type: CHAT_DECLARATION_COLLECTION,
      allowIncoming: preferences.allowIncoming,
      allowGroupInvites: preferences.allowGroupInvites,
    } as any,
  });
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
