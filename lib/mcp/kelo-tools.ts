import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

export interface KeloMcpAuth {
  accessToken: string;
  pdsUrl: string;
  did: string;
  handle: string;
  scopes: string[];
}

type XrpcOptions = {
  method?: "GET" | "POST";
  params?: Record<string, string | number | undefined>;
  body?: unknown;
};

function normalizePds(url: string) {
  return url.trim().replace(/\/$/, "");
}

async function xrpc(auth: KeloMcpAuth, nsid: string, options: XrpcOptions = {}) {
  const pds = normalizePds(auth.pdsUrl);
  const url = new URL(`${pds}/xrpc/${nsid}`);
  for (const [key, value] of Object.entries(options.params || {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      Accept: "application/json",
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(data?.message || data?.error || `AT Protocol request failed (${response.status})`);
  return data;
}

function uriParts(uri: string) {
  const match = /^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(uri.trim());
  if (!match) throw new Error("URI AT Protocol invalide.");
  return { repo: match[1], collection: match[2], rkey: match[3] };
}

function result(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function requireWrite(auth: KeloMcpAuth) {\n  if (!auth.scopes.includes("kelo:write")) throw new Error("Cette action nécessite l’autorisation « Agir sur Kelo Social ». Reconnectez le client MCP et accordez cette permission.");\n}\n\nfunction errorResult(error: unknown) {
  return { isError: true, content: [{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }] };
}

async function getProfile(auth: KeloMcpAuth, actor: string) {
  return xrpc(auth, "app.bsky.actor.getProfile", { params: { actor } });
}

async function resolveActorDid(auth: KeloMcpAuth, actor: string) {
  if (actor.startsWith("did:")) return actor;
  return (await getProfile(auth, actor.replace(/^@/, ""))).did as string;
}

async function createRecord(auth: KeloMcpAuth, collection: string, record: unknown) {
  return xrpc(auth, "com.atproto.repo.createRecord", {
    method: "POST",
    body: { repo: auth.did, collection, record },
  });
}

async function deleteRecord(auth: KeloMcpAuth, uri: string) {
  const parts = uriParts(uri);
  return xrpc(auth, "com.atproto.repo.deleteRecord", {
    method: "POST",
    body: { repo: auth.did, collection: parts.collection, rkey: parts.rkey },
  });
}

export function buildKeloMcpServer(auth: KeloMcpAuth) {
  const server = new McpServer({ name: "kelo-social", version: "1.0.0" });

  server.registerTool("kelo_get_my_profile", {
    title: "Mon profil Kelo Social",
    description: "Lire le profil du compte Kelo Social actuellement connecté.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  }, async () => {
    try { return result(await getProfile(auth, auth.did)); } catch (error) { return errorResult(error); }
  });

  server.registerTool("kelo_search_accounts", {
    title: "Rechercher des comptes",
    description: "Rechercher des comptes AT Protocol/Kelo Social par handle ou nom.",
    inputSchema: z.object({ query: z.string().min(1).max(100), limit: z.number().int().min(1).max(25).default(10) }),
    annotations: { readOnlyHint: true },
  }, async ({ query, limit }) => {
    try { return result(await xrpc(auth, "app.bsky.actor.searchActors", { params: { q: query, limit } })); } catch (error) { return errorResult(error); }
  });

  server.registerTool("kelo_get_feed", {
    title: "Lire mon fil",
    description: "Lire le fil principal du compte connecté.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(20), cursor: z.string().optional() }),
    annotations: { readOnlyHint: true },
  }, async ({ limit, cursor }) => {
    try { return result(await xrpc(auth, "app.bsky.feed.getTimeline", { params: { limit, cursor } })); } catch (error) { return errorResult(error); }
  });

  server.registerTool("kelo_get_notifications", {
    title: "Lire mes notifications",
    description: "Lire les notifications récentes du compte connecté.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(25) }),
    annotations: { readOnlyHint: true },
  }, async ({ limit }) => {
    try { return result(await xrpc(auth, "app.bsky.notification.listNotifications", { params: { limit } })); } catch (error) { return errorResult(error); }
  });

  server.registerTool("kelo_get_post_thread", {
    title: "Lire une conversation",
    description: "Lire une publication et son fil de réponses.",
    inputSchema: z.object({ uri: z.string().min(10) }),
    annotations: { readOnlyHint: true },
  }, async ({ uri }) => {
    try { return result(await xrpc(auth, "app.bsky.feed.getPostThread", { params: { uri, depth: 10, parentHeight: 10 } })); } catch (error) { return errorResult(error); }
  });

  server.registerTool("kelo_create_post", {
    title: "Publier une publication",
    description: "Publier un nouveau post sur le compte de l'utilisateur. Utiliser uniquement quand l'utilisateur demande explicitement de publier.",
    inputSchema: z.object({ text: z.string().min(1).max(3000) }),
  }, async ({ text }) => {\n    requireWrite(auth);
    try { return result(await createRecord(auth, "app.bsky.feed.post", { $type: "app.bsky.feed.post", text, createdAt: new Date().toISOString() })); } catch (error) { return errorResult(error); }
  });

  server.registerTool("kelo_reply_to_post", {
    title: "Répondre à une publication",
    description: "Publier une réponse à une publication existante.",
    inputSchema: z.object({
      text: z.string().min(1).max(3000),
      parentUri: z.string().min(10),
      parentCid: z.string().min(10),
      rootUri: z.string().optional(),
      rootCid: z.string().optional(),
    }),
  }, async ({ text, parentUri, parentCid, rootUri, rootCid }) => {\n    requireWrite(auth);
    try {
      const root = rootUri && rootCid ? { uri: rootUri, cid: rootCid } : { uri: parentUri, cid: parentCid };
      return result(await createRecord(auth, "app.bsky.feed.post", {
        $type: "app.bsky.feed.post", text, createdAt: new Date().toISOString(),
        reply: { root, parent: { uri: parentUri, cid: parentCid } },
      }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("kelo_delete_post", {
    title: "Supprimer une publication",
    description: "Supprimer une publication appartenant au compte connecté. Action irréversible : utiliser uniquement sur demande explicite.",
    inputSchema: z.object({ uri: z.string().min(10) }),
  }, async ({ uri }) => {\n    requireWrite(auth);
    try {
      const parts = uriParts(uri);
      if (parts.repo !== auth.did || parts.collection !== "app.bsky.feed.post") throw new Error("Vous ne pouvez supprimer que vos propres publications.");
      await deleteRecord(auth, uri);
      return result({ success: true, uri });
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("kelo_follow_account", {
    title: "Suivre un compte",
    description: "Suivre un compte avec le compte actuellement connecté.",
    inputSchema: z.object({ actor: z.string().min(1).max(200) }),
  }, async ({ actor }) => {\n    requireWrite(auth);
    try {
      const did = await resolveActorDid(auth, actor);
      return result(await createRecord(auth, "app.bsky.graph.follow", { $type: "app.bsky.graph.follow", subject: did, createdAt: new Date().toISOString() }));
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("kelo_unfollow_account", {
    title: "Ne plus suivre un compte",
    description: "Arrêter de suivre un compte avec le compte actuellement connecté.",
    inputSchema: z.object({ actor: z.string().min(1).max(200) }),
  }, async ({ actor }) => {\n    requireWrite(auth);
    try {
      const did = await resolveActorDid(auth, actor);
      const relationships = await xrpc(auth, "app.bsky.graph.getRelationships", { params: { actor: auth.did, others: did } });
      const followingUri = relationships.relationships?.[0]?.following;
      if (!followingUri) return result({ success: true, alreadyFollowing: false });
      await deleteRecord(auth, followingUri);
      return result({ success: true, followingUri });
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("kelo_like_post", {
    title: "Aimer une publication",
    description: "Aimer une publication avec le compte actuellement connecté.",
    inputSchema: z.object({ uri: z.string().min(10), cid: z.string().min(10) }),
  }, async ({ uri, cid }) => {\n    requireWrite(auth);
    try { return result(await createRecord(auth, "app.bsky.feed.like", { $type: "app.bsky.feed.like", subject: { uri, cid }, createdAt: new Date().toISOString() })); } catch (error) { return errorResult(error); }
  });

  server.registerTool("kelo_unlike_post", {
    title: "Retirer un j'aime",
    description: "Retirer le j'aime du compte connecté sur une publication.",
    inputSchema: z.object({ uri: z.string().min(10) }),
  }, async ({ uri }) => {\n    requireWrite(auth);
    try {
      const posts = await xrpc(auth, "app.bsky.feed.getPosts", { params: { uris: uri } });
      const likeUri = posts.posts?.[0]?.viewer?.like;
      if (!likeUri) return result({ success: true, alreadyLiked: false });
      await deleteRecord(auth, likeUri);
      return result({ success: true, likeUri });
    } catch (error) { return errorResult(error); }
  });

  server.registerTool("kelo_repost", {
    title: "Reposter une publication",
    description: "Reposter une publication avec le compte actuellement connecté.",
    inputSchema: z.object({ uri: z.string().min(10), cid: z.string().min(10) }),
  }, async ({ uri, cid }) => {\n    requireWrite(auth);
    try { return result(await createRecord(auth, "app.bsky.feed.repost", { $type: "app.bsky.feed.repost", subject: { uri, cid }, createdAt: new Date().toISOString() })); } catch (error) { return errorResult(error); }
  });

  server.registerTool("kelo_unrepost", {
    title: "Retirer un repost",
    description: "Retirer le repost du compte connecté sur une publication.",
    inputSchema: z.object({ uri: z.string().min(10) }),
  }, async ({ uri }) => {\n    requireWrite(auth);
    try {
      const posts = await xrpc(auth, "app.bsky.feed.getPosts", { params: { uris: uri } });
      const repostUri = posts.posts?.[0]?.viewer?.repost;
      if (!repostUri) return result({ success: true, alreadyReposted: false });
      await deleteRecord(auth, repostUri);
      return result({ success: true, repostUri });
    } catch (error) { return errorResult(error); }
  });

  return server;
}
