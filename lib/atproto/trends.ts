export interface TrendingTopic {
  topic: string;
  displayName?: string;
  description?: string;
  link?: string;
}

/**
 * Tendances du réseau fédéré (app.bsky.unspecced.getTrendingTopics).
 * Endpoint public, non authentifié, pas encore inclus dans les types
 * de la version d'@atproto/api installée — on l'appelle donc directement
 * en HTTP plutôt que via le client SDK.
 */
export async function getTrendingTopics(limit = 5): Promise<TrendingTopic[]> {
  const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.unspecced.getTrendingTopics?limit=${limit}`);
  if (!res.ok) throw new Error("Impossible de récupérer les tendances.");
  const data = await res.json();
  return data.topics || [];
}
