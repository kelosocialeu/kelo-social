import { getAuthenticatedAgent } from "@/services/auth.service";

export const KELO_ALGORITHM_LEVELS = ["very-low", "medium", "medium-addictive", "addictive"] as const;
export type KeloAlgorithmLevel = (typeof KELO_ALGORITHM_LEVELS)[number];

const COLLECTION = "eu.kelosocial.algorithm";
const RKEY = "self";

export function isKeloAlgorithmLevel(value: unknown): value is KeloAlgorithmLevel {
  return typeof value === "string" && (KELO_ALGORITHM_LEVELS as readonly string[]).includes(value);
}

export async function getSavedKeloAlgorithm(): Promise<KeloAlgorithmLevel | null> {
  try {
    const { agent, session } = await getAuthenticatedAgent();
    const response = await agent.api.com.atproto.repo.getRecord({
      repo: session.did,
      collection: COLLECTION,
      rkey: RKEY,
    });
    const value = response.data?.value as any;
    return isKeloAlgorithmLevel(value?.level) ? value.level : null;
  } catch {
    return null;
  }
}

export async function saveKeloAlgorithm(level: KeloAlgorithmLevel): Promise<void> {
  const { agent, session } = await getAuthenticatedAgent();
  await agent.api.com.atproto.repo.putRecord({
    repo: session.did,
    collection: COLLECTION,
    rkey: RKEY,
    record: {
      $type: COLLECTION,
      level,
      updatedAt: new Date().toISOString(),
    },
  });
}
