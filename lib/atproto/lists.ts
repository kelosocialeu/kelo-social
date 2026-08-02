import { getReadAgent } from "@/lib/atproto/read-agent";

export interface CuratedList {
  uri: string;
  label: string;
}

/**
 * Listes officielles Kelo Social (app.bsky.graph.list), visibles pour tous
 * les utilisateurs du réseau fédéré, quel que soit leur PDS d'origine
 * (Bluesky, Eurosky, Kelo Social...). Contrairement aux fils personnalisés,
 * ces 4 listes ne dépendent d'aucune préférence utilisateur : elles sont
 * toujours affichées.
 */
export const KELO_CURATED_LISTS: CuratedList[] = [
  { uri: "at://did:plc:imrzw2qx5suox3y5pmcz5z57/app.bsky.graph.list/3mrlf2kjo6i22", label: "Kelo User" },
  { uri: "at://did:plc:imrzw2qx5suox3y5pmcz5z57/app.bsky.graph.list/3mrlghdzq7c2j", label: "Kelo Entreprise" },
  { uri: "at://did:plc:imrzw2qx5suox3y5pmcz5z57/app.bsky.graph.list/3mrlfcyaw5b2j", label: "Kelo Media" },
  { uri: "at://did:plc:imrzw2qx5suox3y5pmcz5z57/app.bsky.graph.list/3mrlh4ibcrt24", label: "Kelo Politique" },
];

/** Métadonnées d'une liste (nom, avatar, description, nombre de membres). */
export async function getListInfo(uri: string) {
  const agent = await getReadAgent();
  const res = await agent.api.app.bsky.graph.getList({ list: uri, limit: 1 });
  return res.data.list;
}

/** Publications des membres d'une liste, avec pagination par curseur. */
export async function getListFeedPosts(uri: string, limit = 25, cursor?: string) {
  const agent = await getReadAgent();
  const res = await agent.api.app.bsky.feed.getListFeed({ list: uri, limit, cursor });
  return { items: res.data.feed, cursor: res.data.cursor };
}
