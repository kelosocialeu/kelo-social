export type KeloContentPreferences = {
  interfaceLanguage: string;
  postLanguages: string[];
  interests: string[];
};

export const KELO_LANGUAGES = [
  ["auto", "Automatique (appareil)"], ["fr", "Français"], ["en", "English"], ["es", "Español"], ["de", "Deutsch"], ["it", "Italiano"], ["pt", "Português"], ["nl", "Nederlands"], ["pl", "Polski"], ["ro", "Română"], ["cs", "Čeština"], ["sk", "Slovenčina"], ["hu", "Magyar"], ["sv", "Svenska"], ["da", "Dansk"], ["no", "Norsk"], ["fi", "Suomi"], ["is", "Íslenska"], ["et", "Eesti"], ["lv", "Latviešu"], ["lt", "Lietuvių"], ["el", "Ελληνικά"], ["bg", "Български"], ["uk", "Українська"], ["ru", "Русский"], ["sr", "Српски"], ["hr", "Hrvatski"], ["sl", "Slovenščina"], ["bs", "Bosanski"], ["mk", "Македонски"], ["sq", "Shqip"], ["tr", "Türkçe"], ["ar", "العربية"], ["he", "עברית"], ["fa", "فارسی"], ["ur", "اردو"], ["hi", "हिन्दी"], ["bn", "বাংলা"], ["pa", "ਪੰਜਾਬੀ"], ["gu", "ગુજરાતી"], ["mr", "मराठी"], ["ne", "नेपाली"], ["si", "සිංහල"], ["ta", "தமிழ்"], ["te", "తెలుగు"], ["kn", "ಕನ್ನಡ"], ["ml", "മലയാളം"], ["th", "ไทย"], ["vi", "Tiếng Việt"], ["id", "Bahasa Indonesia"], ["ms", "Bahasa Melayu"], ["fil", "Filipino"], ["zh-CN", "简体中文"], ["zh-TW", "繁體中文"], ["ja", "日本語"], ["ko", "한국어"], ["mn", "Монгол"], ["ka", "ქართული"], ["hy", "Հայերեն"], ["az", "Azərbaycanca"], ["kk", "Қазақша"], ["uz", "O‘zbekcha"], ["sw", "Kiswahili"], ["af", "Afrikaans"], ["am", "አማርኛ"], ["ha", "Hausa"], ["yo", "Yorùbá"], ["ig", "Igbo"], ["zu", "isiZulu"], ["xh", "isiXhosa"], ["so", "Soomaali"], ["mg", "Malagasy"], ["rw", "Kinyarwanda"], ["ht", "Kreyòl ayisyen"], ["ca", "Català"], ["eu", "Euskara"], ["gl", "Galego"], ["cy", "Cymraeg"], ["ga", "Gaeilge"], ["mt", "Malti"], ["eo", "Esperanto"], ["la", "Latina"], ["mi", "Māori"], ["sm", "Gagana Samoa"], ["haw", "ʻŌlelo Hawaiʻi"]
] as const;

export const KELO_INTERESTS = ["Actualités", "Art", "Cinéma", "Culture", "Éducation", "Environnement", "Finance", "Gaming", "Histoire", "Humour", "Livres", "Musique", "Politique", "Sciences", "Sport", "Technologie", "Voyage"];

const DEFAULT_PREFERENCES: KeloContentPreferences = {
  interfaceLanguage: "auto",
  postLanguages: [],
  interests: [],
};

const accountKey = (did?: string | null) =>
  `kelo-content-preferences:${did?.trim() || "guest"}`;

// Copie de secours indépendante du chargement de la session. Cela évite que
// l'interface repasse brièvement sur les valeurs par défaut lorsque le DID est
// encore vide au démarrage de l'application.
const LAST_PREFERENCES_KEY = "kelo-content-preferences:last";

function parsePreferences(raw: string | null): KeloContentPreferences | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<KeloContentPreferences>;
    return {
      interfaceLanguage:
        typeof parsed.interfaceLanguage === "string"
          ? parsed.interfaceLanguage
          : DEFAULT_PREFERENCES.interfaceLanguage,
      postLanguages: Array.isArray(parsed.postLanguages)
        ? parsed.postLanguages.filter((value): value is string => typeof value === "string")
        : [],
      interests: Array.isArray(parsed.interests)
        ? parsed.interests.filter((value): value is string => typeof value === "string")
        : [],
    };
  } catch {
    return null;
  }
}

export function getKeloContentPreferences(
  did?: string | null
): KeloContentPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_PREFERENCES };

  const account = parsePreferences(localStorage.getItem(accountKey(did)));
  if (account) return account;

  const last = parsePreferences(localStorage.getItem(LAST_PREFERENCES_KEY));

  // Si la session vient seulement de charger, on réassocie automatiquement la
  // dernière préférence connue au compte afin qu'elle reste stable au retour.
  if (last && did) {
    localStorage.setItem(accountKey(did), JSON.stringify(last));
    return last;
  }

  return last || { ...DEFAULT_PREFERENCES };
}

export function saveKeloContentPreferences(
  did: string | null | undefined,
  prefs: KeloContentPreferences
) {
  if (typeof window === "undefined") return;

  const normalized: KeloContentPreferences = {
    interfaceLanguage: prefs.interfaceLanguage || "auto",
    postLanguages: [...new Set(prefs.postLanguages || [])],
    interests: [...new Set(prefs.interests || [])],
  };

  const serialized = JSON.stringify(normalized);
  localStorage.setItem(accountKey(did), serialized);
  localStorage.setItem(LAST_PREFERENCES_KEY, serialized);
}

export function resolvedInterfaceLanguage(value: string) {
  if (value !== "auto") return value;
  return typeof navigator !== "undefined" ? (navigator.language || "fr") : "fr";
}
