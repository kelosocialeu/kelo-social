const TRIAL_COLLECTION = "eu.kelosocial.trial";
const TRIAL_RKEY = "self";
export const KELO_TRIAL_DURATION_MS = 48 * 60 * 60 * 1000;

export interface KeloTrialStatus {
  active: boolean;
  startedAt: string;
  expiresAt: string;
  remainingMs: number;
}

function buildStatus(startedAt: string, nowMs = Date.now()): KeloTrialStatus {
  const startedAtMs = new Date(startedAt).getTime();
  const safeStartedAtMs = Number.isFinite(startedAtMs) ? startedAtMs : nowMs;
  const expiresAtMs = safeStartedAtMs + KELO_TRIAL_DURATION_MS;

  return {
    active: nowMs < expiresAtMs,
    startedAt: new Date(safeStartedAtMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    remainingMs: Math.max(0, expiresAtMs - nowMs),
  };
}

async function getServerNow(): Promise<number> {
  try {
    const response = await fetch("/api/trial/status", { cache: "no-store" });
    if (!response.ok) return Date.now();
    const data = (await response.json()) as { now?: string };
    const parsed = data.now ? new Date(data.now).getTime() : NaN;
    return Number.isFinite(parsed) ? parsed : Date.now();
  } catch {
    return Date.now();
  }
}

export async function getOrStartKeloTrial(agent: any, did: string): Promise<KeloTrialStatus> {
  const nowMs = await getServerNow();

  try {
    const existing = await agent.api.com.atproto.repo.getRecord({
      repo: did,
      collection: TRIAL_COLLECTION,
      rkey: TRIAL_RKEY,
    });

    const startedAt = String(existing?.data?.value?.startedAt || "");
    if (startedAt) return buildStatus(startedAt, nowMs);
  } catch {
    // Aucun marqueur Kelo Social : c'est la première connexion à Kelo Social.
  }

  const startedAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + KELO_TRIAL_DURATION_MS).toISOString();

  await agent.api.com.atproto.repo.putRecord({
    repo: did,
    collection: TRIAL_COLLECTION,
    rkey: TRIAL_RKEY,
    validate: false,
    record: {
      $type: TRIAL_COLLECTION,
      startedAt,
      expiresAt,
      source: "kelo-social-first-login",
    },
  });

  return buildStatus(startedAt, nowMs);
}

export async function readKeloTrial(agent: any, did: string): Promise<KeloTrialStatus | null> {
  const nowMs = await getServerNow();

  try {
    const existing = await agent.api.com.atproto.repo.getRecord({
      repo: did,
      collection: TRIAL_COLLECTION,
      rkey: TRIAL_RKEY,
    });
    const startedAt = String(existing?.data?.value?.startedAt || "");
    return startedAt ? buildStatus(startedAt, nowMs) : null;
  } catch {
    return null;
  }
}
