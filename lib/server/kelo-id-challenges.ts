import { callKeloId } from "@/lib/server/kelo-id-verification";

interface ChallengeFetchResult {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
}

interface CachedChallenge {
  expiresAt: number;
  result: ChallengeFetchResult;
}

type KeloChallengeRuntime = typeof globalThis & {
  __keloChallengeCache?: Map<string, CachedChallenge>;
  __keloChallengeInflight?: Map<string, Promise<ChallengeFetchResult>>;
};

const CACHE_TTL_MS = 2 * 60 * 1000;
const runtime = globalThis as KeloChallengeRuntime;
const approvedCache =
  runtime.__keloChallengeCache || new Map<string, CachedChallenge>();
const inflight =
  runtime.__keloChallengeInflight ||
  new Map<string, Promise<ChallengeFetchResult>>();

runtime.__keloChallengeCache = approvedCache;
runtime.__keloChallengeInflight = inflight;

function cleanupExpiredEntries() {
  const now = Date.now();

  for (const [id, cached] of approvedCache.entries()) {
    if (cached.expiresAt <= now) {
      approvedCache.delete(id);
    }
  }
}

/**
 * Reads a Kelo ID challenge exactly once at a time.
 *
 * Kelo ID challenges may be single-use once approved. Desktop QR polling,
 * mobile redirects and React re-renders can otherwise issue overlapping
 * status requests and make a valid challenge look "already consumed".
 * Approved responses are therefore cached briefly and concurrent reads for
 * the same challenge share one upstream request.
 */
export async function getKeloIdChallenge(
  id: string
): Promise<ChallengeFetchResult> {
  cleanupExpiredEntries();

  const cached = approvedCache.get(id);
  if (cached) {
    return cached.result;
  }

  const pending = inflight.get(id);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    const response = await callKeloId(
      `/api/integrations/kelo-social/challenges?id=${encodeURIComponent(id)}`,
      { method: "GET" }
    );

    let data: Record<string, unknown> = {};

    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      data = {};
    }

    const result: ChallengeFetchResult = {
      ok: response.ok,
      status: response.status,
      data,
    };

    if (response.ok && data.status === "approved") {
      approvedCache.set(id, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        result,
      });
    }

    return result;
  })();

  inflight.set(id, request);

  try {
    return await request;
  } finally {
    inflight.delete(id);
  }
}
