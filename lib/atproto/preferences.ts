import { getReadAgent } from "@/lib/atproto/read-agent";
import { getStoredSession, resumeAgentSession } from "@/services/auth.service";

async function getWriteAgent() {
  const session = getStoredSession();
  if (!session) throw new Error("Vous devez être connecté.");
  return resumeAgentSession(session);
}

export async function getPreferences(): Promise<any[]> {
  const agent = await getReadAgent();
  const res = await agent.api.app.bsky.actor.getPreferences();
  return res.data.preferences;
}

async function putPreferences(preferences: any[]): Promise<void> {
  const agent = await getWriteAgent();
  await agent.api.app.bsky.actor.putPreferences({ preferences }, { encoding: "application/json" });
}

function upsertPref(prefs: any[], type: string, value: any): any[] {
  const filtered = prefs.filter((p) => p.$type !== type);
  return [...filtered, { $type: type, ...value }];
}

export async function getAdultContentEnabled(): Promise<boolean> {
  const prefs = await getPreferences();
  const pref = prefs.find((p) => p.$type === "app.bsky.actor.defs#adultContentPref");
  return pref?.enabled ?? false;
}

export async function setAdultContentEnabled(enabled: boolean): Promise<void> {
  const prefs = await getPreferences();
  await putPreferences(upsertPref(prefs, "app.bsky.actor.defs#adultContentPref", { enabled }));
}

export type LabelVisibility = "show" | "warn" | "hide";

export const CONTENT_LABELS = [
  { key: "nudity", title: "Nudité" },
  { key: "sexual", title: "Contenu suggestif" },
  { key: "graphic-media", title: "Violence / contenu choquant" },
  { key: "spam", title: "Spam" },
];

export async function getContentLabelPrefs(): Promise<Record<string, LabelVisibility>> {
  const prefs = await getPreferences();
  const map: Record<string, LabelVisibility> = {};
  for (const label of CONTENT_LABELS) {
    const pref = prefs.find((p) => p.$type === "app.bsky.actor.defs#contentLabelPref" && p.label === label.key);
    map[label.key] = (pref?.visibility as LabelVisibility) || "warn";
  }
  return map;
}

export async function setContentLabelVisibility(label: string, visibility: LabelVisibility): Promise<void> {
  const prefs = await getPreferences();
  const filtered = prefs.filter(
    (p) => !(p.$type === "app.bsky.actor.defs#contentLabelPref" && p.label === label)
  );
  filtered.push({ $type: "app.bsky.actor.defs#contentLabelPref", label, visibility });
  await putPreferences(filtered);
}

export interface MutedWordEntry {
  value: string;
  targets: string[];
}

export async function getMutedWords(): Promise<MutedWordEntry[]> {
  const prefs = await getPreferences();
  const pref = prefs.find((p) => p.$type === "app.bsky.actor.defs#mutedWordsPref");
  return pref?.items || [];
}

export async function addMutedWord(value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) return;
  const prefs = await getPreferences();
  const pref = prefs.find((p) => p.$type === "app.bsky.actor.defs#mutedWordsPref");
  const items = pref?.items || [];
  if (items.some((w: MutedWordEntry) => w.value === trimmed)) return;
  const newItems = [...items, { value: trimmed, targets: ["content", "tag"], actorTarget: "all" }];
  await putPreferences(upsertPref(prefs, "app.bsky.actor.defs#mutedWordsPref", { items: newItems }));
}

export async function removeMutedWord(value: string): Promise<void> {
  const prefs = await getPreferences();
  const pref = prefs.find((p) => p.$type === "app.bsky.actor.defs#mutedWordsPref");
  const items = (pref?.items || []).filter((w: MutedWordEntry) => w.value !== value);
  await putPreferences(upsertPref(prefs, "app.bsky.actor.defs#mutedWordsPref", { items }));
}
