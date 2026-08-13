import { getReadAgent } from "@/lib/atproto/read-agent";
import { getAuthenticatedAgent } from "@/services/auth.service";

interface ProfileCacheEntry {
  value: any;
  expiresAt: number;
}

const PROFILE_CACHE_MS = 60_000;
const profileCache = new Map<string, ProfileCacheEntry>();
const pendingProfiles = new Map<string, Promise<any>>();
const PROFILE_COLLECTION = "app.bsky.actor.profile";
const POST_COLLECTION = "app.bsky.feed.post";

function normalizeActor(actor: string): string {
  return actor.trim().toLowerCase();
}

export function clearProfileCache(
  actor?: string
): void {
  if (actor) {
    const key = normalizeActor(actor);
    profileCache.delete(key);
    pendingProfiles.delete(key);
    return;
  }

  profileCache.clear();
  pendingProfiles.clear();
}

export async function getActorProfile(
  actor: string
) {
  const key = normalizeActor(actor);
  const cached = profileCache.get(key);

  if (
    cached &&
    cached.expiresAt > Date.now()
  ) {
    return cached.value;
  }

  const pending = pendingProfiles.get(key);
  if (pending) return pending;

  const request = (async () => {
    const agent = await getReadAgent();
    const response =
      await agent.api.app.bsky.actor.getProfile({
        actor,
      });

    profileCache.set(key, {
      value: response.data,
      expiresAt: Date.now() + PROFILE_CACHE_MS,
    });

    return response.data;
  })();

  pendingProfiles.set(key, request);

  try {
    return await request;
  } finally {
    pendingProfiles.delete(key);
  }
}

export async function getActorFeed(
  actor: string,
  limit = 30,
  cursor?: string
) {
  const agent = await getReadAgent();

  const response =
    await agent.api.app.bsky.feed.getAuthorFeed({
      actor,
      limit,
      cursor,
    });

  return {
    items: response.data.feed,
    cursor: response.data.cursor,
  };
}

export async function getActorFollowers(
  actor: string,
  limit = 50,
  cursor?: string
) {
  const agent = await getReadAgent();
  const response = await agent.api.app.bsky.graph.getFollowers({
    actor,
    limit,
    cursor,
  });

  return {
    items: response.data.followers,
    cursor: response.data.cursor,
  };
}

export async function getActorFollows(
  actor: string,
  limit = 50,
  cursor?: string
) {
  const agent = await getReadAgent();
  const response = await agent.api.app.bsky.graph.getFollows({
    actor,
    limit,
    cursor,
  });

  return {
    items: response.data.follows,
    cursor: response.data.cursor,
  };
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

  const agent = await getReadAgent();
  const response = await agent.api.app.bsky.feed.getPosts({
    uris: [uri],
  });

  return response.data.posts[0] || null;
}
