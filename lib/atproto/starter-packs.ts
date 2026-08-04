import {
  createList,
  deleteList,
} from "@/lib/atproto/lists";
import { getReadAgent } from "@/lib/atproto/read-agent";
import {
  getStoredSession,
  resumeAgentSession,
} from "@/services/auth.service";

const STARTER_PACK_COLLECTION = "app.bsky.graph.starterpack";

export interface StarterPackFeedItem {
  uri: string;
}

export interface StarterPackCreator {
  did?: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
}

export interface StarterPackListView {
  uri?: string;
  cid?: string;
  name?: string;
  description?: string;
  avatar?: string;
  listItemCount?: number;
  creator?: StarterPackCreator;
}

export interface StarterPackView {
  uri: string;
  cid?: string;
  record?: {
    $type?: string;
    name?: string;
    description?: string;
    list?: string;
    feeds?: StarterPackFeedItem[];
    createdAt?: string;
  };
  creator?: StarterPackCreator;
  list?: StarterPackListView;
  listItemsSample?: Array<{
    uri?: string;
    subject?: {
      did?: string;
      handle?: string;
      displayName?: string;
      avatar?: string;
    };
  }>;
  feeds?: any[];
  joinedWeekCount?: number;
  joinedAllTimeCount?: number;
  indexedAt?: string;
}

export interface CreateStarterPackPayload {
  name: string;
  description?: string;
  listUri: string;
  feedUris?: string[];
}

export interface CreateStarterPackWithListPayload {
  name: string;
  description?: string;
  avatarFile?: File | null;
  feedUris?: string[];
}

export interface UpdateStarterPackPayload {
  uri: string;
  name: string;
  description?: string;
  listUri: string;
  feedUris?: string[];
  createdAt?: string;
}

async function getWriteAgent() {
  const session = getStoredSession();

  if (!session) {
    throw new Error("Vous devez être connecté.");
  }

  return {
    agent: await resumeAgentSession(session),
    session,
  };
}

function normalizeOptionalText(
  value?: string
): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function getDidFromUri(uri: string): string {
  if (!uri.startsWith("at://")) {
    throw new Error("L’URI du kit de démarrage est invalide.");
  }

  const did = uri.slice("at://".length).split("/")[0];

  if (!did) {
    throw new Error(
      "Le propriétaire du kit de démarrage est introuvable."
    );
  }

  return did;
}

function getRkeyFromUri(uri: string): string {
  const rkey = uri.split("/").at(-1);

  if (!rkey) {
    throw new Error(
      "L’identifiant du kit de démarrage est invalide."
    );
  }

  return rkey;
}

function validateStarterPackFields(
  name: string,
  description?: string,
  feedUris: string[] = []
) {
  if (!name) {
    throw new Error(
      "Le nom du kit de démarrage est obligatoire."
    );
  }

  if (name.length > 50) {
    throw new Error(
      "Le nom du kit de démarrage ne peut pas dépasser 50 caractères."
    );
  }

  if (description && description.length > 300) {
    throw new Error(
      "La description ne peut pas dépasser 300 caractères."
    );
  }

  if (feedUris.length > 3) {
    throw new Error(
      "Un kit de démarrage peut contenir au maximum trois fils d’actu."
    );
  }

  for (const uri of feedUris) {
    if (!uri.startsWith("at://")) {
      throw new Error(
        "L’un des fils d’actu sélectionnés possède une URI invalide."
      );
    }
  }
}

function buildStarterPackRecord({
  name,
  description,
  listUri,
  feedUris = [],
  createdAt,
}: {
  name: string;
  description?: string;
  listUri: string;
  feedUris?: string[];
  createdAt?: string;
}) {
  const record: Record<string, unknown> = {
    $type: STARTER_PACK_COLLECTION,
    name,
    list: listUri,
    createdAt: createdAt || new Date().toISOString(),
  };

  if (description) {
    record.description = description;
  }

  if (feedUris.length > 0) {
    record.feeds = feedUris.map((uri) => ({ uri }));
  }

  return record;
}

/**
 * Récupère les kits de démarrage créés par un compte.
 */
export async function getActorStarterPacks(
  actor: string,
  limit = 50,
  cursor?: string
): Promise<{
  items: StarterPackView[];
  cursor?: string;
}> {
  const agent = await getReadAgent();

  const response =
    await agent.api.app.bsky.graph.getActorStarterPacks({
      actor,
      limit,
      cursor,
    });

  return {
    items: response.data.starterPacks as StarterPackView[],
    cursor: response.data.cursor,
  };
}

/**
 * Récupère tous les kits de démarrage du compte connecté.
 */
export async function getMyStarterPacks(): Promise<
  StarterPackView[]
> {
  const session = getStoredSession();

  if (!session) {
    throw new Error("Vous devez être connecté.");
  }

  const items: StarterPackView[] = [];
  let cursor: string | undefined;

  do {
    const response = await getActorStarterPacks(
      session.did,
      100,
      cursor
    );

    items.push(...response.items);
    cursor = response.cursor;
  } while (cursor);

  return items;
}

/**
 * Récupère plusieurs kits de démarrage à partir de leurs URI.
 */
export async function getStarterPacks(
  uris: string[]
): Promise<StarterPackView[]> {
  if (uris.length === 0) {
    return [];
  }

  const agent = await getReadAgent();
  const results: StarterPackView[] = [];

  for (let index = 0; index < uris.length; index += 25) {
    const batch = uris.slice(index, index + 25);

    const response =
      await agent.api.app.bsky.graph.getStarterPacks({
        uris: batch,
      });

    results.push(
      ...(response.data.starterPacks as StarterPackView[])
    );
  }

  return results;
}

/**
 * Crée un kit de démarrage lié à une liste existante.
 */
export async function createStarterPack(
  payload: CreateStarterPackPayload
): Promise<{
  uri: string;
  cid: string;
}> {
  const name = payload.name.trim();
  const description = normalizeOptionalText(
    payload.description
  );
  const listUri = payload.listUri.trim();
  const feedUris = (payload.feedUris || [])
    .map((uri) => uri.trim())
    .filter(Boolean);

  validateStarterPackFields(
    name,
    description,
    feedUris
  );

  if (!listUri.startsWith("at://")) {
    throw new Error(
      "La liste liée au kit de démarrage est invalide."
    );
  }

  const { agent, session } = await getWriteAgent();

  const response =
    await agent.api.com.atproto.repo.createRecord({
      repo: session.did,
      collection: STARTER_PACK_COLLECTION,
      record: buildStarterPackRecord({
        name,
        description,
        listUri,
        feedUris,
      }),
    });

  return {
    uri: response.data.uri,
    cid: response.data.cid,
  };
}

/**
 * Crée la liste liée puis le kit de démarrage.
 *
 * L’image est stockée sur la liste, car le record officiel du kit
 * de démarrage ne possède pas de champ avatar.
 */
export async function createStarterPackWithList(
  payload: CreateStarterPackWithListPayload
): Promise<{
  starterPackUri: string;
  starterPackCid: string;
  listUri: string;
  listCid: string;
}> {
  const name = payload.name.trim();
  const description = normalizeOptionalText(
    payload.description
  );
  const feedUris = (payload.feedUris || [])
    .map((uri) => uri.trim())
    .filter(Boolean);

  validateStarterPackFields(
    name,
    description,
    feedUris
  );

  const createdList = await createList({
    name,
    description,
    avatarFile: payload.avatarFile,
  });

  try {
    const createdStarterPack = await createStarterPack({
      name,
      description,
      listUri: createdList.uri,
      feedUris,
    });

    return {
      starterPackUri: createdStarterPack.uri,
      starterPackCid: createdStarterPack.cid,
      listUri: createdList.uri,
      listCid: createdList.cid,
    };
  } catch (error) {
    try {
      await deleteList(createdList.uri);
    } catch (cleanupError) {
      console.error(
        "Impossible de nettoyer la liste créée après l’échec du kit :",
        cleanupError
      );
    }

    throw error;
  }
}

/**
 * Modifie un kit de démarrage appartenant au compte connecté.
 */
export async function updateStarterPack(
  payload: UpdateStarterPackPayload
): Promise<void> {
  const name = payload.name.trim();
  const description = normalizeOptionalText(
    payload.description
  );
  const listUri = payload.listUri.trim();
  const feedUris = (payload.feedUris || [])
    .map((uri) => uri.trim())
    .filter(Boolean);

  validateStarterPackFields(
    name,
    description,
    feedUris
  );

  if (!listUri.startsWith("at://")) {
    throw new Error(
      "La liste liée au kit de démarrage est invalide."
    );
  }

  const ownerDid = getDidFromUri(payload.uri);
  const rkey = getRkeyFromUri(payload.uri);
  const { agent, session } = await getWriteAgent();

  if (ownerDid !== session.did) {
    throw new Error(
      "Vous ne pouvez modifier que vos propres kits de démarrage."
    );
  }

  await agent.api.com.atproto.repo.putRecord({
    repo: session.did,
    collection: STARTER_PACK_COLLECTION,
    rkey,
    record: buildStarterPackRecord({
      name,
      description,
      listUri,
      feedUris,
      createdAt: payload.createdAt,
    }),
  });
}

/**
 * Supprime un kit de démarrage.
 *
 * La liste liée n’est pas supprimée automatiquement afin d’éviter
 * toute perte accidentelle de membres.
 */
export async function deleteStarterPack(
  uri: string
): Promise<void> {
  const ownerDid = getDidFromUri(uri);
  const rkey = getRkeyFromUri(uri);
  const { agent, session } = await getWriteAgent();

  if (ownerDid !== session.did) {
    throw new Error(
      "Vous ne pouvez supprimer que vos propres kits de démarrage."
    );
  }

  await agent.api.com.atproto.repo.deleteRecord({
    repo: session.did,
    collection: STARTER_PACK_COLLECTION,
    rkey,
  });
}
