import { createAppViewAgent } from "@/lib/atproto/appview";
import { getReadAgent } from "@/lib/atproto/read-agent";
import { getAuthenticatedAgent } from "@/services/auth.service";

interface ProfileCacheEntry {
  value: any;
  expiresAt: number;
}

const PROFILE_CACHE_MS = 5 * 60_000;
const profileCache = new Map<string, ProfileCacheEntry>();
const pendingProfiles = new Map<string, Promise<any>>();
const PROFILE_COLLECTION = "app.bsky.actor.profile";
const POST_COLLECTION = "app.bsky.feed.post";

function normalizeActor(actor: string): string {
  return actor.trim().replace(/^@/, "").toLowerCase();
}

function isNotFoundError(error: any): boolean {
  const status = Number(error?.status || error?.response?.status || 0);
  const code = String(error?.error || error?.response?.data?.error || "");
  return status === 404 || /notfound|profile.*not.*found|actor.*not.*found/i.test(code);
}

async function readWithPublicFallback<T>(
  authenticatedRead: (agent: any) => Promise<T>,
  publicRead: (agent: any) => Promise<T>
): Promise<T> {
  let firstError: unknown = null;

  try {
    const agent = await getReadAgent();
    return await authenticatedRead(agent);
  } catch (error) {
    firstError = error;
    if (isNotFoundError(error)) throw error;
  }

  try {
    const publicAgent = createAppViewAgent();
    return await publicRead(publicAgent);
  } catch (publicError) {
    // Si le PDS/session a eu un souci transitoire et que l'AppView public
    // échoue aussi, on garde l'erreur publique seulement si elle indique
    // réellement un profil introuvable. Sinon on remonte la première erreur.
    if (isNotFoundError(publicError)) throw publicError;
    throw firstError || publicError;
  }
}

export function clearProfileCache(actor?: string): void {
  if (actor) {
    const key = normalizeActor(actor);
    profileCache.delete(key);
    pendingProfiles.delete(key);
    return;
  }

  profileCache.clear();
  pendingProfiles.clear();
}

export async function getActorProfile(actor: string) {
  const normalizedActor = normalizeActor(actor);
  if (!normalizedActor) throw new Error("Profil invalide.");

  const cached = profileCache.get(normalizedActor);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const pending = pendingProfiles.get(normalizedActor);
  if (pending) return pending;

  const request = (async () => {
    try {
      const data = await readWithPublicFallback(
        async (agent) => {
          const response = await agent.api.app.bsky.actor.getProfile({
            actor: normalizedActor,
          });
          return response.data;
        },
        async (agent) => {
          const response = await agent.api.app.bsky.actor.getProfile({
            actor: normalizedActor,
          });
          return response.data;
        }
      );

      profileCache.set(normalizedActor, {
        value: data,
        expiresAt: Date.now() + PROFILE_CACHE_MS,
      });

      // Le handle peut changer. Indexer aussi le DID permet de réutiliser le
      // même profil sans refaire une requête réseau.
      if (data?.did) {
        profileCache.set(normalizeActor(data.did), {
          value: data,
          expiresAt: Date.now() + PROFILE_CACHE_MS,
        });
      }

      return data;
    } catch (error) {
      // Un ancien profil en cache vaut mieux qu'un faux "introuvable" quand
      // un PDS ou l'AppView subit une panne temporaire.
      if (cached?.value && !isNotFoundError(error)) {
        return cached.value;
      }
      throw error;
    }
  })();

  pendingProfiles.set(normalizedActor, request);

  try {
    return await request;
  } finally {
    pendingProfiles.delete(normalizedActor);
  }
}

export async function getActorFeed(
  actor: string,
  limit = 30,
  cursor?: string
) {
  const normalizedActor = normalizeActor(actor);

  return readWithPublicFallback(
    async (agent) => {
      const response = await agent.api.app.bsky.feed.getAuthorFeed({
        actor: normalizedActor,
        limit,
        cursor,
      });
      return { items: response.data.feed, cursor: response.data.cursor };
    },
    async (agent) => {
      const response = await agent.api.app.bsky.feed.getAuthorFeed({
        actor: normalizedActor,
        limit,
        cursor,
      });
      return { items: response.data.feed, cursor: response.data.cursor };
    }
  );
}

export async function getActorFollowers(
  actor: string,
  limit = 50,
  cursor?: string
) {
  const normalizedActor = normalizeActor(actor);

  return readWithPublicFallback(
    async (agent) => {
      const response = await agent.api.app.bsky.graph.getFollowers({
        actor: normalizedActor,
        limit,
        cursor,
      });
      return { items: response.data.followers, cursor: response.data.cursor };
    },
    async (agent) => {
      const response = await agent.api.app.bsky.graph.getFollowers({
        actor: normalizedActor,
        limit,
        cursor,
      });
      return { items: response.data.followers, cursor: response.data.cursor };
    }
  );
}

export async function getActorFollows(
  actor: string,
  limit = 50,
  cursor?: string
) {
  const normalizedActor = normalizeActor(actor);

  return readWithPublicFallback(
    async (agent) => {
      const response = await agent.api.app.bsky.graph.getFollows({
        actor: normalizedActor,
        limit,
        cursor,
      });
      return { items: response.data.follows, cursor: response.data.cursor };
    },
    async (agent) => {
      const response = await agent.api.app.bsky.graph.getFollows({
        actor: normalizedActor,
        limit,
        cursor,
      });
      return { items: response.data.follows, cursor: response.data.cursor };
    }
  );
}

export async function setOwnPinnedPost(post: { uri: string; cid: string }) {
  const { agent, session } = await getAuthenticatedAgent();
  const expectedPrefix = `at://${session.did}/${POST_COLLECTION}/`;

  if (!post?.uri?.startsWith(expectedPrefix) || !post?.cid?.trim()) {
    throw new Error("Vous ne pouvez épingler que l’une de vos propres publications.");
  }

  let profileRecord: Record<string, unknown> = {
    $type: PROFILE_COLLECTION,
  };

  try {
    const current = await agent.api.com.atproto.repo.getRecord({
      repo: session.did,
      collection: PROFILE_COLLECTION,
      rkey: "self",
    });
    profileRecord = current.data.value as Record<string, unknown>;
  } catch (error: any) {
    if (error?.status !== 404) throw error;
  }

  await agent.api.com.atproto.repo.putRecord({
    repo: session.did,
    collection: PROFILE_COLLECTION,
    rkey: "self",
    record: {
      ...profileRecord,
      $type: PROFILE_COLLECTION,
      pinnedPost: {
        $type: "com.atproto.repo.strongRef",
        uri: post.uri,
        cid: post.cid,
      },
    } as any,
  });

  clearProfileCache(session.handle);
  clearProfileCache(session.did);
}

export async function clearOwnPinnedPost() {
  const { agent, session } = await getAuthenticatedAgent();

  let current;
  try {
    current = await agent.api.com.atproto.repo.getRecord({
      repo: session.did,
      collection: PROFILE_COLLECTION,
      rkey: "self",
    });
  } catch (error: any) {
    if (error?.status === 404) return;
    throw error;
  }

  const profileRecord = {
    ...(current.data.value as Record<string, unknown>),
  } as Record<string, unknown>;

  delete profileRecord.pinnedPost;
  profileRecord.$type = PROFILE_COLLECTION;

  await agent.api.com.atproto.repo.putRecord({
    repo: session.did,
    collection: PROFILE_COLLECTION,
    rkey: "self",
    record: profileRecord as any,
  });

  clearProfileCache(session.handle);
  clearProfileCache(session.did);
}

export async function getPostByUri(uri?: string | null) {
  if (!uri) return null;

  return readWithPublicFallback(
    async (agent) => {
      const response = await agent.api.app.bsky.feed.getPosts({ uris: [uri] });
      return response.data.posts[0] || null;
    },
    async (agent) => {
      const response = await agent.api.app.bsky.feed.getPosts({ uris: [uri] });
      return response.data.posts[0] || null;
    }
  );
}
