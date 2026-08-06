import { getReadAgent } from "@/lib/atproto/read-agent";

interface ProfileCacheEntry {
  value: any;
  expiresAt: number;
}

const PROFILE_CACHE_MS = 60_000;
const profileCache = new Map<string, ProfileCacheEntry>();
const pendingProfiles = new Map<string, Promise<any>>();

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
