export type KeloTheme = "system" | "light" | "dark";
export type TextScale = "90" | "100" | "110" | "120";
export type KeloPalette =
  | "default"
  | "violet-cyan"
  | "rose-sunset"
  | "blue-green"
  | "prism"
  | "classic-blue"
  | "classic-violet"
  | "classic-green"
  | "classic-rose"
  | "classic-orange"
  | "classic-red"
  | "classic-black";

export interface DisplayPreferences {
  theme: KeloTheme;
  textScale: TextScale;
  reduceMotion: boolean;
  palette: KeloPalette;
}

type PaletteDefinition = {
  primary: string;
  primaryRgb: string;
  secondary: string;
  secondaryRgb: string;
  gradient: string;
};

const solid = (color: string) => `linear-gradient(90deg,${color} 0%,${color} 100%)`;

export const KELO_PALETTES: Record<KeloPalette, PaletteDefinition> = {
  default: {
    primary: "#7d4cff",
    primaryRgb: "125 76 255",
    secondary: "#d54cff",
    secondaryRgb: "213 76 255",
    gradient: "linear-gradient(90deg,#7d4cff 0%,#b14fff 50%,#ff4fa0 100%)",
  },
  "violet-cyan": {
    primary: "#6d24ff",
    primaryRgb: "109 36 255",
    secondary: "#08bfd3",
    secondaryRgb: "8 191 211",
    gradient: "linear-gradient(135deg,#a000ff 0%,#5d22ff 30%,#176cff 58%,#10d9d4 100%)",
  },
  "rose-sunset": {
    primary: "#ee2b91",
    primaryRgb: "238 43 145",
    secondary: "#ff7a16",
    secondaryRgb: "255 122 22",
    gradient: "linear-gradient(135deg,#ff2f77 0%,#df25c8 36%,#ad32f4 58%,#ff9911 100%)",
  },
  "blue-green": {
    primary: "#126cff",
    primaryRgb: "18 108 255",
    secondary: "#14c987",
    secondaryRgb: "20 201 135",
    gradient: "linear-gradient(135deg,#173cff 0%,#087eff 30%,#0ac9df 62%,#31d34f 100%)",
  },
  prism: {
    primary: "#d414cf",
    primaryRgb: "212 20 207",
    secondary: "#168bff",
    secondaryRgb: "22 139 255",
    gradient: "linear-gradient(135deg,#ff385d 0%,#ed0ca9 28%,#9718f2 52%,#2464ff 76%,#10d5e5 100%)",
  },
  "classic-blue": {
    primary: "#2563eb", primaryRgb: "37 99 235", secondary: "#2563eb", secondaryRgb: "37 99 235", gradient: solid("#2563eb"),
  },
  "classic-violet": {
    primary: "#7c3aed", primaryRgb: "124 58 237", secondary: "#7c3aed", secondaryRgb: "124 58 237", gradient: solid("#7c3aed"),
  },
  "classic-green": {
    primary: "#059669", primaryRgb: "5 150 105", secondary: "#059669", secondaryRgb: "5 150 105", gradient: solid("#059669"),
  },
  "classic-rose": {
    primary: "#e11d48", primaryRgb: "225 29 72", secondary: "#e11d48", secondaryRgb: "225 29 72", gradient: solid("#e11d48"),
  },
  "classic-orange": {
    primary: "#ea580c", primaryRgb: "234 88 12", secondary: "#ea580c", secondaryRgb: "234 88 12", gradient: solid("#ea580c"),
  },
  "classic-red": {
    primary: "#dc2626", primaryRgb: "220 38 38", secondary: "#dc2626", secondaryRgb: "220 38 38", gradient: solid("#dc2626"),
  },
  "classic-black": {
    primary: "#171717", primaryRgb: "23 23 23", secondary: "#171717", secondaryRgb: "23 23 23", gradient: solid("#171717"),
  },
};

const STORAGE_KEY = "kelo.display.preferences";

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  theme: "system",
  textScale: "100",
  reduceMotion: false,
  palette: "default",
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
  const palette = KELO_PALETTES[prefs.palette] || KELO_PALETTES.default;
  const root = document.documentElement;

  root.classList.toggle("kelo-theme-dark", dark);
  root.classList.toggle("kelo-reduce-motion", prefs.reduceMotion);
  root.style.setProperty("--kelo-text-scale", `${Number(prefs.textScale) / 100}`);
  root.style.setProperty("--primary", palette.primary);
  root.style.setProperty("--primary-rgb", palette.primaryRgb);
  root.style.setProperty("--secondary", palette.secondary);
  root.style.setProperty("--secondary-rgb", palette.secondaryRgb);
  root.style.setProperty("--gradient", palette.gradient);
  root.dataset.keloPalette = prefs.palette;
}

export function saveDisplayPreferences(prefs: DisplayPreferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  applyDisplayPreferences(prefs);
  window.dispatchEvent(new CustomEvent("kelo-display-preferences-changed", { detail: prefs }));
}
