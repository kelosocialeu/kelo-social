import { getAuthenticatedAgent } from "@/services/auth.service";
import type { KeloContentPreferences } from "@/lib/kelo-language-preferences";

const COLLECTION = "eu.kelosocial.preferences";
const RKEY = "self";

function normalizePreferences(value: any): KeloContentPreferences | null {
  if (!value || typeof value !== "object") return null;
  return {
    interfaceLanguage: typeof value.interfaceLanguage === "string" ? value.interfaceLanguage : "auto",
    postLanguages: Array.isArray(value.postLanguages) ? value.postLanguages.filter((item: unknown): item is string => typeof item === "string") : [],
    // Les centres d'intérêt restent locaux : un record de repo AT Protocol est public.
    interests: [],
  };
}

export async function loadRemoteContentPreferences(): Promise<KeloContentPreferences | null> {
  try {
    const { agent, session } = await getAuthenticatedAgent();
    const response = await agent.api.com.atproto.repo.getRecord({
      repo: session.did,
      collection: COLLECTION,
      rkey: RKEY,
    });
    return normalizePreferences(response.data?.value);
  } catch {
    return null;
  }
}

export async function saveRemoteContentPreferences(prefs: KeloContentPreferences): Promise<void> {
  try {
    const { agent, session } = await getAuthenticatedAgent();
    await agent.api.com.atproto.repo.putRecord({
      repo: session.did,
      collection: COLLECTION,
      rkey: RKEY,
      record: {
        $type: COLLECTION,
        interfaceLanguage: prefs.interfaceLanguage || "auto",
        postLanguages: Array.from(new Set(prefs.postLanguages || [])),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.warn("Kelo language preference remote sync skipped:", error);
  }
}
