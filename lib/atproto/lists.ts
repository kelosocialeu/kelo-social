import { getReadAgent } from "@/lib/atproto/read-agent";
import {
  getStoredSession,
  resumeAgentSession,
} from "@/services/auth.service";

export interface CuratedList {
  uri: string;
  label: string;
}

export interface CreateListPayload {
  name: string;
  description?: string;
  avatarFile?: File | null;
}

export interface UpdateListPayload {
  uri: string;
  name: string;
  description?: string;
  avatarFile?: File | null;
  currentAvatar?: unknown;
}

export interface ManagedList {
  uri: string;
  cid?: string;
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
  purpose?: string;
  indexedAt?: string;
}

/**
 * Listes officielles Kelo Social, toujours visibles dans les espaces
 * éditoriaux de Kelo Social.
 */
export const KELO_CURATED_LISTS: CuratedList[] = [
  {
    uri: "at://did:plc:imrzw2qx5suox3y5pmcz5z57/app.bsky.graph.list/3mrlf2kjo6i22",
    label: "Kelo User",
  },
  {
    uri: "at://did:plc:imrzw2qx5suox3y5pmcz5z57/app.bsky.graph.list/3mrlghdzq7c2j",
    label: "Kelo Entreprise",
  },
  {
    uri: "at://did:plc:imrzw2qx5suox3y5pmcz5z57/app.bsky.graph.list/3mrlfcyaw5b2j",
    label: "Kelo Media",
  },
  {
    uri: "at://did:plc:imrzw2qx5suox3y5pmcz5z57/app.bsky.graph.list/3mrlh4ibcrt24",
    label: "Kelo Politique",
  },
];

const LIST_COLLECTION = "app.bsky.graph.list";
const LIST_ITEM_COLLECTION = "app.bsky.graph.listitem";
const CURATE_LIST_PURPOSE = "app.bsky.graph.defs#curatelist";

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

function normalizeText(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function getRkeyFromUri(uri: string): string {
  const parts = uri.split("/");
  const rkey = parts.at(-1);

  if (!rkey) {
    throw new Error("L’identifiant de la liste est invalide.");
  }

  return rkey;
}

function getDidFromUri(uri: string): string {
  if (!uri.startsWith("at://")) {
    throw new Error("L’URI de la liste est invalide.");
  }

  const withoutScheme = uri.slice("at://".length);
  const did = withoutScheme.split("/")[0];

  if (!did) {
    throw new Error("Le propriétaire de la liste est introuvable.");
  }

  return did;
}

/**
 * Téléverse l’image d’une liste sur le PDS du compte connecté.
 */
async function uploadListAvatar(
  file: File
): Promise<unknown> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Le fichier sélectionné doit être une image.");
  }

  const maximumSize = 1_000_000;

  if (file.size > maximumSize) {
    throw new Error(
      "L’image est trop lourde. Utilisez une image de moins de 1 Mo."
    );
  }

  const { agent } = await getWriteAgent();
  const bytes = new Uint8Array(await file.arrayBuffer());

  const response = await agent.uploadBlob(bytes, {
    encoding: file.type || "image/jpeg",
  });

  return response.data.blob;
}

/**
 * Métadonnées et premiers membres d’une liste.
 */
export async function getListInfo(uri: string) {
  const agent = await getReadAgent();

  const response = await agent.api.app.bsky.graph.getList({
    list: uri,
    limit: 1,
  });

  return response.data.list;
}

/**
 * Publications des membres d’une liste.
 */
export async function getListFeedPosts(
  uri: string,
  limit = 25,
  cursor?: string
) {
  const agent = await getReadAgent();

  const response = await agent.api.app.bsky.graph.getLists({
  actor,
  limit,
  cursor,
});

const lists = (response.data.lists as ManagedList[]).filter(
  (list) =>
    !list.purpose ||
    list.purpose === CURATE_LIST_PURPOSE
);

return {
  items: lists,
  cursor: response.data.cursor,
};

/**
 * Récupère les listes publiques créées par un compte.
 */
export async function getActorLists(
  actor: string,
  limit = 50,
  cursor?: string
): Promise<{
  items: ManagedList[];
  cursor?: string;
}> {
  const agent = await getReadAgent();

  const response = await agent.api.app.bsky.graph.getLists({
    actor,
    limit,
    cursor,
    purposes: [CURATE_LIST_PURPOSE],
  });

  return {
    items: response.data.lists as ManagedList[],
    cursor: response.data.cursor,
  };
}

/**
 * Récupère toutes les listes de curation créées par le compte connecté.
 */
export async function getMyLists(): Promise<ManagedList[]> {
  const session = getStoredSession();

  if (!session) {
    throw new Error("Vous devez être connecté.");
  }

  const lists: ManagedList[] = [];
  let cursor: string | undefined;

  do {
    const response = await getActorLists(
      session.did,
      50,
      cursor
    );

    lists.push(...response.items);
    cursor = response.cursor;
  } while (cursor);

  return lists;
}

/**
 * Crée une liste de comptes dans le dépôt AT Protocol de l’utilisateur.
 */
export async function createList(
  payload: CreateListPayload
): Promise<{
  uri: string;
  cid: string;
}> {
  const name = payload.name.trim();

  if (!name) {
    throw new Error("Le nom de la liste est obligatoire.");
  }

  if (name.length > 64) {
    throw new Error(
      "Le nom de la liste ne peut pas dépasser 64 caractères."
    );
  }

  const description = normalizeText(payload.description);

  if (description && description.length > 300) {
    throw new Error(
      "La description ne peut pas dépasser 300 caractères."
    );
  }

  const { agent, session } = await getWriteAgent();

  let avatar: unknown;

  if (payload.avatarFile) {
    avatar = await uploadListAvatar(payload.avatarFile);
  }

  const record: Record<string, unknown> = {
    $type: LIST_COLLECTION,
    purpose: CURATE_LIST_PURPOSE,
    name,
    createdAt: new Date().toISOString(),
  };

  if (description) {
    record.description = description;
  }

  if (avatar) {
    record.avatar = avatar;
  }

  const response =
    await agent.api.com.atproto.repo.createRecord({
      repo: session.did,
      collection: LIST_COLLECTION,
      record,
    });

  return {
    uri: response.data.uri,
    cid: response.data.cid,
  };
}

/**
 * Modifie le nom, la description ou l’image d’une liste existante.
 */
export async function updateList(
  payload: UpdateListPayload
): Promise<void> {
  const name = payload.name.trim();

  if (!name) {
    throw new Error("Le nom de la liste est obligatoire.");
  }

  if (name.length > 64) {
    throw new Error(
      "Le nom de la liste ne peut pas dépasser 64 caractères."
    );
  }

  const description = normalizeText(payload.description);
  const ownerDid = getDidFromUri(payload.uri);
  const rkey = getRkeyFromUri(payload.uri);
  const { agent, session } = await getWriteAgent();

  if (ownerDid !== session.did) {
    throw new Error(
      "Vous ne pouvez modifier que les listes créées par votre compte."
    );
  }

  let avatar = payload.currentAvatar;

  if (payload.avatarFile) {
    avatar = await uploadListAvatar(payload.avatarFile);
  }

  const record: Record<string, unknown> = {
    $type: LIST_COLLECTION,
    purpose: CURATE_LIST_PURPOSE,
    name,
    createdAt: new Date().toISOString(),
  };

  if (description) {
    record.description = description;
  }

  if (avatar) {
    record.avatar = avatar;
  }

  await agent.api.com.atproto.repo.putRecord({
    repo: session.did,
    collection: LIST_COLLECTION,
    rkey,
    record,
  });
}

/**
 * Supprime une liste créée par le compte connecté.
 *
 * Les records listitem associés doivent être retirés séparément.
 * Une fonction de nettoyage des membres sera ajoutée dans l’étape suivante.
 */
export async function deleteList(uri: string): Promise<void> {
  const ownerDid = getDidFromUri(uri);
  const rkey = getRkeyFromUri(uri);
  const { agent, session } = await getWriteAgent();

  if (ownerDid !== session.did) {
    throw new Error(
      "Vous ne pouvez supprimer que les listes créées par votre compte."
    );
  }

  await agent.api.com.atproto.repo.deleteRecord({
    repo: session.did,
    collection: LIST_COLLECTION,
    rkey,
  });
}

/**
 * Récupère les membres d’une liste avec pagination.
 */
export async function getListMembers(
  listUri: string,
  limit = 50,
  cursor?: string
) {
  const agent = await getReadAgent();

  const response = await agent.api.app.bsky.graph.getList({
    list: listUri,
    limit,
    cursor,
  });

  return {
    list: response.data.list,
    items: response.data.items,
    cursor: response.data.cursor,
  };
}

/**
 * Ajoute un compte à une liste créée par l’utilisateur connecté.
 */
export async function addListMember(
  listUri: string,
  subjectDid: string
): Promise<{
  uri: string;
  cid: string;
}> {
  const listOwnerDid = getDidFromUri(listUri);
  const { agent, session } = await getWriteAgent();

  if (listOwnerDid !== session.did) {
    throw new Error(
      "Vous ne pouvez gérer que les membres de vos propres listes."
    );
  }

  const response =
    await agent.api.com.atproto.repo.createRecord({
      repo: session.did,
      collection: LIST_ITEM_COLLECTION,
      record: {
        $type: LIST_ITEM_COLLECTION,
        subject: subjectDid,
        list: listUri,
        createdAt: new Date().toISOString(),
      },
    });

  return {
    uri: response.data.uri,
    cid: response.data.cid,
  };
}

/**
 * Retire un membre d’une liste à partir de l’URI du record listitem.
 */
export async function removeListMember(
  listItemUri: string
): Promise<void> {
  const ownerDid = getDidFromUri(listItemUri);
  const rkey = getRkeyFromUri(listItemUri);
  const { agent, session } = await getWriteAgent();

  if (ownerDid !== session.did) {
    throw new Error(
      "Vous ne pouvez retirer que les membres de vos propres listes."
    );
  }

  await agent.api.com.atproto.repo.deleteRecord({
    repo: session.did,
    collection: LIST_ITEM_COLLECTION,
    rkey,
  });
}
