export type KeloTheme = "system" | "light" | "dark";
export type TextScale = "90" | "100" | "110" | "120";

export interface DisplayPreferences {
  theme: KeloTheme;
  textScale: TextScale;
  reduceMotion: boolean;
}

const STORAGE_KEY = "kelo.display.preferences";

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  theme: "system",
  textScale: "100",
  reduceMotion: false,
};

export function getDisplayPreferences(): DisplayPreferences {
  if (typeof window === "undefined") return DEFAULT_DISPLAY_PREFERENCES;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...DEFAULT_DISPLAY_PREFERENCES, ...stored };
  } catch {
    return DEFAULT_DISPLAY_PREFERENCES;
  }
}

export function applyDisplayPreferences(prefs: DisplayPreferences): void {
  if (typeof document === "undefined") return;

  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const dark = prefs.theme === "dark" || (prefs.theme === "system" && prefersDark);

  document.documentElement.classList.toggle("kelo-theme-dark", dark);
  document.documentElement.classList.toggle("kelo-reduce-motion", prefs.reduceMotion);
  document.documentElement.style.setProperty("--kelo-text-scale", `${Number(prefs.textScale) / 100}`);
}

export function saveDisplayPreferences(prefs: DisplayPreferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  applyDisplayPreferences(prefs);
  window.dispatchEvent(new CustomEvent("kelo-display-preferences-changed", { detail: prefs }));
}
