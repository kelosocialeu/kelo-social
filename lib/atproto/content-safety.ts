import {
  getContentLabelPrefs,
  type LabelVisibility,
} from "@/lib/atproto/preferences";

export type SafetyLabel = "nudity" | "sexual" | "graphic-media" | "spam";

export interface ContentSafetyPrefs {
  nudity: LabelVisibility;
  sexual: LabelVisibility;
  "graphic-media": LabelVisibility;
  spam: LabelVisibility;
}

const STORAGE_KEY = "kelo-content-safety-prefs-v1";
const EVENT_NAME = "kelo-content-safety-updated";

const DEFAULT_PREFS: ContentSafetyPrefs = {
  nudity: "warn",
  sexual: "warn",
  "graphic-media": "warn",
  spam: "hide",
};

let cachedPrefs: ContentSafetyPrefs | null = null;
let pendingLoad: Promise<ContentSafetyPrefs> | null = null;

function normalizePrefs(value: Partial<Record<SafetyLabel, LabelVisibility>>): ContentSafetyPrefs {
  return {
    nudity: value.nudity || DEFAULT_PREFS.nudity,
    sexual: value.sexual || DEFAULT_PREFS.sexual,
    "graphic-media": value["graphic-media"] || DEFAULT_PREFS["graphic-media"],
    spam: value.spam || DEFAULT_PREFS.spam,
  };
}

function readLocal(): ContentSafetyPrefs | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizePrefs(JSON.parse(raw));
  } catch {
    return null;
  }
}

function persistLocal(prefs: ContentSafetyPrefs) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: prefs }));
  } catch {
    // Les préférences AT Protocol restent la source de vérité.
  }
}

export function getCachedContentSafetyPrefs(): ContentSafetyPrefs {
  if (cachedPrefs) return cachedPrefs;
  cachedPrefs = readLocal() || DEFAULT_PREFS;
  return cachedPrefs;
}

export async function loadContentSafetyPrefs(): Promise<ContentSafetyPrefs> {
  if (pendingLoad) return pendingLoad;

  pendingLoad = (async () => {
    try {
      const remote = await getContentLabelPrefs();
      cachedPrefs = normalizePrefs(remote);
      persistLocal(cachedPrefs);
      return cachedPrefs;
    } catch {
      cachedPrefs = readLocal() || DEFAULT_PREFS;
      return cachedPrefs;
    }
  })();

  try {
    return await pendingLoad;
  } finally {
    pendingLoad = null;
  }
}

export function updateCachedContentSafetyPref(
  label: SafetyLabel,
  visibility: LabelVisibility
) {
  cachedPrefs = {
    ...getCachedContentSafetyPrefs(),
    [label]: visibility,
  };
  persistLocal(cachedPrefs);
}

export function subscribeContentSafetyPrefs(
  callback: (prefs: ContentSafetyPrefs) => void
): () => void {
  if (typeof window === "undefined") return () => undefined;

  const listener = (event: Event) => {
    const custom = event as CustomEvent<ContentSafetyPrefs>;
    callback(custom.detail || getCachedContentSafetyPrefs());
  };

  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

export function extractPostSafetyLabels(post: any): SafetyLabel[] {
  const values = new Set<string>();

  const selfLabels = post?.record?.labels?.values;
  if (Array.isArray(selfLabels)) {
    selfLabels.forEach((entry: any) => {
      if (typeof entry?.val === "string") values.add(entry.val);
    });
  }

  if (Array.isArray(post?.labels)) {
    post.labels.forEach((entry: any) => {
      if (typeof entry?.val === "string" && !entry?.neg) values.add(entry.val);
    });
  }

  return Array.from(values).filter((value): value is SafetyLabel =>
    ["nudity", "sexual", "graphic-media", "spam"].includes(value)
  );
}

export function getSafetyLabelTitle(label: SafetyLabel): string {
  switch (label) {
    case "nudity":
      return "Nudité";
    case "sexual":
      return "Contenu suggestif";
    case "graphic-media":
      return "Actualité crue / contenu graphique";
    case "spam":
      return "Contenu indésirable";
  }
}

export function resolvePostVisibility(
  labels: SafetyLabel[],
  prefs: ContentSafetyPrefs
): { mode: LabelVisibility; label?: SafetyLabel } {
  const priority: LabelVisibility[] = ["hide", "warn", "show"];

  for (const mode of priority) {
    const label = labels.find((item) => prefs[item] === mode);
    if (label) return { mode, label };
  }

  return { mode: "show" };
}
