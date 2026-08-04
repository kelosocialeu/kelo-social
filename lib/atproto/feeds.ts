import { getReadAgent } from "@/lib/atproto/read-agent";
import {
  getStoredSession,
  resumeAgentSession,
} from "@/services/auth.service";

async function getWriteAgent() {
  const session = getStoredSession();

  if (!session) {
    throw new Error("Vous devez être connecté.");
  }

  return resumeAgentSession(session);
}

export type SavedItemType = "feed" | "list" | "timeline";

export interface SavedFeedItem {
  id: string;
  type: SavedItemType;
  value: string;
  pinned: boolean;
}

export interface SavedFeedDetails {
  id: string;
  type: "feed";
  uri: string;
  pinned: boolean;
  displayName: string;
  description?: string;
  avatar?: string;
  creator?: {
    did?: string;
    handle?: string;
    displayName?: string;
    avatar?: string;
  };
}

export interface SavedListDetails {
  id: string;
  type: "list";
  uri: string;
  pinned: boolean;
  name: string;
  description?: string;
  avatar?: string;
  listItemCount?: number;
  creator?: {
    did?: string;
    handle?: string;
    displayName?: string;
    avatar?: string;
  };
}

export type SavedItemDetails =
  | SavedFeedDetails
  | SavedListDetails;

const SAVED_FEEDS_TYPE =
  "app.bsky.actor.defs#savedFeedsPrefV2";

async function getPreferences(): Promise<any[]> {
  const agent = await getReadAgent();
  const response =
    await agent.api.app.bsky.actor.getPreferences();

  return response.data.preferences;
}

async function putPreferences(
  preferences: any[]
): Promise<void> {
  const agent = await getWriteAgent();

  await agent.api.app.bsky.actor.putPreferences(
    {
      preferences,
    },
    {
      encoding: "application/json",
    }
  );
}

function getSavedPreference(preferences: any[]) {
  return preferences.find(
    (preference) =>
      preference.$type === SAVED_FEEDS_TYPE
  );
}

function replaceSavedPreference(
  preferences: any[],
  items: SavedFeedItem[]
): any[] {
  const filteredPreferences = preferences.filter(
    (preference) =>
      preference.$type !== SAVED_FEEDS_TYPE
  );

  return [
    ...filteredPreferences,
    {
      $type: SAVED_FEEDS_TYPE,
      items,
    },
  ];
}

function createSavedItemId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

/**
 * Retourne tous les fils, listes et timelines enregistrés.
 */
export async function getSavedFeedItems(): Promise<
  SavedFeedItem[]
> {
  const preferences = await getPreferences();
  const preference =
    getSavedPreference(preferences);

  const items = Array.isArray(preference?.items)
    ? preference.items
    : [];

  return items.filter(
    (item: any): item is SavedFeedItem =>
      typeof item?.id === "string" &&
      typeof item?.value === "string" &&
      typeof item?.pinned === "boolean" &&
      ["feed", "list", "timeline"].includes(
        item?.type
      )
  );
}

/**
 * Retourne uniquement les éléments épinglés,
 * dans l’ordre enregistré dans les préférences.
 */
export async function getPinnedSavedItems(): Promise<
  SavedFeedItem[]
> {
  const items = await getSavedFeedItems();

  return items.filter((item) => item.pinned);
}

/**
 * Résout les métadonnées de plusieurs fils d’actu.
 */
export async function getFeedGenerators(
  uris: string[]
) {
  if (uris.length === 0) {
    return [];
  }

  const agent = await getReadAgent();

  const response =
    await agent.api.app.bsky.feed.getFeedGenerators({
      feeds: uris,
    });

  return response.data.feeds;
}

/**
 * Résout les métadonnées de plusieurs listes.
 */
export async function getListsMetadata(
  uris: string[]
) {
  if (uris.length === 0) {
    return [];
  }

  const agent = await getReadAgent();

  const results = await Promise.all(
    uris.map(async (uri) => {
      try {
        const response =
          await agent.api.app.bsky.graph.getList({
            list: uri,
            limit: 1,
          });

        return response.data.list;
      } catch (error) {
        console.error(
          `Impossible de charger la liste ${uri}`,
          error
        );

        return null;
      }
    })
  );

  return results.filter(Boolean);
}

/**
 * Retourne les métadonnées complètes de tous les éléments épinglés.
 */
export async function getPinnedSavedItemDetails(): Promise<
  SavedItemDetails[]
> {
  const pinnedItems =
    await getPinnedSavedItems();

  const feedItems = pinnedItems.filter(
    (item) => item.type === "feed"
  );

  const listItems = pinnedItems.filter(
    (item) => item.type === "list"
  );

  const [feedGenerators, lists] =
    await Promise.all([
      getFeedGenerators(
        feedItems.map((item) => item.value)
      ),
      getListsMetadata(
        listItems.map((item) => item.value)
      ),
    ]);

  const feedMap = new Map(
    feedGenerators.map((feed: any) => [
      feed.uri,
      feed,
    ])
  );

  const listMap = new Map(
    lists.map((list: any) => [
      list.uri,
      list,
    ])
  );

  return pinnedItems
    .map((item): SavedItemDetails | null => {
      if (item.type === "feed") {
        const feed = feedMap.get(item.value);

        if (!feed) {
          return null;
        }

        return {
          id: item.id,
          type: "feed",
          uri: item.value,
          pinned: item.pinned,
          displayName:
            feed.displayName || "Fil d’actu",
          description: feed.description,
          avatar: feed.avatar,
          creator: feed.creator,
        };
      }

      if (item.type === "list") {
        const list = listMap.get(item.value);

        if (!list) {
          return null;
        }

        return {
          id: item.id,
          type: "list",
          uri: item.value,
          pinned: item.pinned,
          name: list.name || "Liste",
          description: list.description,
          avatar: list.avatar,
          listItemCount:
            list.listItemCount,
          creator: list.creator,
        };
      }

      return null;
    })
    .filter(
      (
        item
      ): item is SavedItemDetails =>
        item !== null
    );
}

/**
 * Fils d’actu populaires du réseau fédéré.
 */
export async function getPopularFeeds(
  query?: string,
  limit = 20
) {
  const agent = await getReadAgent();

  const response =
    await agent.api.app.bsky.unspecced.getPopularFeedGenerators(
      {
        query,
        limit,
      }
    );

  return response.data.feeds;
}

/**
 * Enregistre un élément générique.
 */
export async function saveItem(
  type: SavedItemType,
  uri: string
): Promise<void> {
  const preferences = await getPreferences();
  const preference =
    getSavedPreference(preferences);

  const items: SavedFeedItem[] =
    preference?.items || [];

  if (
    items.some(
      (item) =>
        item.type === type &&
        item.value === uri
    )
  ) {
    return;
  }

  const newItem: SavedFeedItem = {
    id: createSavedItemId(),
    type,
    value: uri,
    pinned: false,
  };

  await putPreferences(
    replaceSavedPreference(preferences, [
      ...items,
      newItem,
    ])
  );
}

/**
 * Enregistre un fil d’actu.
 */
export async function saveFeed(
  uri: string
): Promise<void> {
  return saveItem("feed", uri);
}

/**
 * Enregistre une liste.
 */
export async function saveList(
  uri: string
): Promise<void> {
  return saveItem("list", uri);
}

/**
 * Supprime un élément enregistré.
 */
export async function removeSavedItem(
  type: SavedItemType,
  uri: string
): Promise<void> {
  const preferences = await getPreferences();
  const preference =
    getSavedPreference(preferences);

  const items: SavedFeedItem[] = (
    preference?.items || []
  ).filter(
    (item: SavedFeedItem) =>
      !(
        item.type === type &&
        item.value === uri
      )
  );

  await putPreferences(
    replaceSavedPreference(preferences, items)
  );
}

/**
 * Supprime un fil enregistré.
 */
export async function removeFeed(
  uri: string
): Promise<void> {
  return removeSavedItem("feed", uri);
}

/**
 * Supprime une liste enregistrée.
 */
export async function removeList(
  uri: string
): Promise<void> {
  return removeSavedItem("list", uri);
}

/**
 * Épingle ou désépingle un élément.
 */
export async function togglePinSavedItem(
  type: SavedItemType,
  uri: string
): Promise<void> {
  const preferences = await getPreferences();
  const preference =
    getSavedPreference(preferences);

  const items: SavedFeedItem[] = (
    preference?.items || []
  ).map((item: SavedFeedItem) =>
    item.type === type &&
    item.value === uri
      ? {
          ...item,
          pinned: !item.pinned,
        }
      : item
  );

  await putPreferences(
    replaceSavedPreference(preferences, items)
  );
}

/**
 * Épingle ou désépingle un fil.
 */
export async function togglePinFeed(
  uri: string
): Promise<void> {
  return togglePinSavedItem("feed", uri);
}

/**
 * Épingle ou désépingle une liste.
 */
export async function togglePinList(
  uri: string
): Promise<void> {
  return togglePinSavedItem("list", uri);
}

/**
 * Publications d’un fil d’actu personnalisé.
 */
export async function getFeedPosts(
  feedUri: string,
  limit = 25,
  cursor?: string
) {
  const agent = await getReadAgent();

  const response =
    await agent.api.app.bsky.feed.getFeed({
      feed: feedUri,
      limit,
      cursor,
    });

  return {
    items: response.data.feed,
    cursor: response.data.cursor,
  };
}
