import { createAppViewAgent } from "@/lib/atproto/appview";

/**
 * Recherche de publications sur l'ensemble du réseau fédéré
 * (Bluesky, WSocial, Eurosky, Kelo Social...), via l'AppView public.
 */
export async function searchNetworkPosts(query: string, limit = 25) {
  const agent = createAppViewAgent();
  const res = await agent.api.app.bsky.feed.searchPosts({ q: query, limit });
  return res.data.posts;
}

/**
 * Recherche de comptes (profils) sur l'ensemble du réseau fédéré.
 */
export async function searchNetworkActors(query: string, limit = 6) {
  const agent = createAppViewAgent();
  const res = await agent.api.app.bsky.actor.searchActors({ q: query, limit });
  return res.data.actors;
}
