export type KeloContentPreferences = {
  interfaceLanguage: string;
  postLanguages: string[];
  interests: string[];
};

export const KELO_LANGUAGES = [
  ["auto", "Automatique (appareil)"], ["fr", "Français"], ["en", "English"], ["es", "Español"], ["de", "Deutsch"], ["it", "Italiano"], ["pt", "Português"], ["nl", "Nederlands"], ["pl", "Polski"], ["ro", "Română"], ["cs", "Čeština"], ["sk", "Slovenčina"], ["hu", "Magyar"], ["sv", "Svenska"], ["da", "Dansk"], ["no", "Norsk"], ["fi", "Suomi"], ["is", "Íslenska"], ["et", "Eesti"], ["lv", "Latviešu"], ["lt", "Lietuvių"], ["el", "Ελληνικά"], ["bg", "Български"], ["uk", "Українська"], ["ru", "Русский"], ["sr", "Српски"], ["hr", "Hrvatski"], ["sl", "Slovenščina"], ["bs", "Bosanski"], ["mk", "Македонски"], ["sq", "Shqip"], ["tr", "Türkçe"], ["ar", "العربية"], ["he", "עברית"], ["fa", "فارسی"], ["ur", "اردو"], ["hi", "हिन्दी"], ["bn", "বাংলা"], ["pa", "ਪੰਜਾਬੀ"], ["gu", "ગુજરાતી"], ["mr", "मराठी"], ["ne", "नेपाली"], ["si", "සිංහල"], ["ta", "தமிழ்"], ["te", "తెలుగు"], ["kn", "ಕನ್ನಡ"], ["ml", "മലയാളം"], ["th", "ไทย"], ["vi", "Tiếng Việt"], ["id", "Bahasa Indonesia"], ["ms", "Bahasa Melayu"], ["fil", "Filipino"], ["zh-CN", "简体中文"], ["zh-TW", "繁體中文"], ["ja", "日本語"], ["ko", "한국어"], ["mn", "Монгол"], ["ka", "ქართული"], ["hy", "Հայերեն"], ["az", "Azərbaycanca"], ["kk", "Қазақша"], ["uz", "O‘zbekcha"], ["sw", "Kiswahili"], ["af", "Afrikaans"], ["am", "አማርኛ"], ["ha", "Hausa"], ["yo", "Yorùbá"], ["ig", "Igbo"], ["zu", "isiZulu"], ["xh", "isiXhosa"], ["so", "Soomaali"], ["mg", "Malagasy"], ["rw", "Kinyarwanda"], ["ht", "Kreyòl ayisyen"], ["ca", "Català"], ["eu", "Euskara"], ["gl", "Galego"], ["cy", "Cymraeg"], ["ga", "Gaeilge"], ["mt", "Malti"], ["eo", "Esperanto"], ["la", "Latina"], ["mi", "Māori"], ["sm", "Gagana Samoa"], ["haw", "ʻŌlelo Hawaiʻi"]
] as const;

export const KELO_INTERESTS = ["Actualités", "Art", "Cinéma", "Culture", "Éducation", "Environnement", "Finance", "Gaming", "Histoire", "Humour", "Livres", "Musique", "Politique", "Sciences", "Sport", "Technologie", "Voyage"];

const key = (did?: string | null) => `kelo-content-preferences:${did || "guest"}`;

export function getKeloContentPreferences(did?: string | null): KeloContentPreferences {
  const fallback: KeloContentPreferences = { interfaceLanguage: "auto", postLanguages: [], interests: [] };
  if (typeof window === "undefined") return fallback;
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key(did)) || "{}") }; } catch { return fallback; }
}

export function saveKeloContentPreferences(did: string | null | undefined, prefs: KeloContentPreferences) {
  if (typeof window !== "undefined") localStorage.setItem(key(did), JSON.stringify(prefs));
}

export function resolvedInterfaceLanguage(value: string) {
  if (value !== "auto") return value;
  return typeof navigator !== "undefined" ? (navigator.language || "fr") : "fr";
}
