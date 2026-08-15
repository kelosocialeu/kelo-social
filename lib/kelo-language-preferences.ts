export type KeloContentPreferences = {
  interfaceLanguage: string;
  postLanguages: string[];
  interests: string[];
};

// 80 langues largement utilisées dans le monde. On évite ici les variantes
// régionales (en-US, fr-BE, etc.) afin de garder une liste claire côté Kelo.
export const KELO_LANGUAGES = [
  ["auto", "Automatique (appareil)"],
  ["en", "English"],
  ["zh-CN", "简体中文"],
  ["hi", "हिन्दी"],
  ["es", "Español"],
  ["ar", "العربية"],
  ["fr", "Français"],
  ["bn", "বাংলা"],
  ["pt", "Português"],
  ["ru", "Русский"],
  ["ur", "اردو"],
  ["id", "Bahasa Indonesia"],
  ["de", "Deutsch"],
  ["ja", "日本語"],
  ["sw", "Kiswahili"],
  ["mr", "मराठी"],
  ["te", "తెలుగు"],
  ["tr", "Türkçe"],
  ["ta", "தமிழ்"],
  ["vi", "Tiếng Việt"],
  ["ko", "한국어"],
  ["fa", "فارسی"],
  ["ha", "Hausa"],
  ["it", "Italiano"],
  ["th", "ไทย"],
  ["gu", "ગુજરાતી"],
  ["pl", "Polski"],
  ["uk", "Українська"],
  ["pa", "ਪੰਜਾਬੀ"],
  ["ml", "മലയാളം"],
  ["kn", "ಕನ್ನಡ"],
  ["or", "ଓଡ଼ିଆ"],
  ["my", "မြန်မာဘာသာ"],
  ["nl", "Nederlands"],
  ["ro", "Română"],
  ["el", "Ελληνικά"],
  ["cs", "Čeština"],
  ["hu", "Magyar"],
  ["sv", "Svenska"],
  ["az", "Azərbaycanca"],
  ["uz", "O‘zbekcha"],
  ["am", "አማርኛ"],
  ["so", "Soomaali"],
  ["ne", "नेपाली"],
  ["si", "සිංහල"],
  ["km", "ខ្មែរ"],
  ["lo", "ລາວ"],
  ["fil", "Filipino"],
  ["ms", "Bahasa Melayu"],
  ["jv", "Basa Jawa"],
  ["su", "Basa Sunda"],
  ["yo", "Yorùbá"],
  ["ig", "Igbo"],
  ["zu", "isiZulu"],
  ["xh", "isiXhosa"],
  ["rw", "Kinyarwanda"],
  ["mg", "Malagasy"],
  ["af", "Afrikaans"],
  ["he", "עברית"],
  ["bg", "Български"],
  ["sr", "Српски"],
  ["hr", "Hrvatski"],
  ["sk", "Slovenčina"],
  ["da", "Dansk"],
  ["fi", "Suomi"],
  ["no", "Norsk"],
  ["lt", "Lietuvių"],
  ["lv", "Latviešu"],
  ["et", "Eesti"],
  ["sl", "Slovenščina"],
  ["bs", "Bosanski"],
  ["sq", "Shqip"],
  ["mk", "Македонски"],
  ["ka", "ქართული"],
  ["hy", "Հայերեն"],
  ["kk", "Қазақша"],
  ["ky", "Кыргызча"],
  ["tg", "Тоҷикӣ"],
  ["tk", "Türkmençe"],
  ["mn", "Монгол"],
  ["ca", "Català"]
] as const;

export const KELO_INTERESTS = ["Actualités", "Art", "Cinéma", "Culture", "Éducation", "Environnement", "Finance", "Gaming", "Histoire", "Humour", "Livres", "Musique", "Politique", "Sciences", "Sport", "Technologie", "Voyage"];

const DEFAULT_PREFERENCES: KeloContentPreferences = {
  interfaceLanguage: "auto",
  postLanguages: [],
  interests: [],
};

const accountKey = (did?: string | null) =>
  `kelo-content-preferences:${did?.trim() || "guest"}`;

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
    postLanguages: Array.from(new Set(prefs.postLanguages || [])),
    interests: Array.from(new Set(prefs.interests || [])),
  };

  const serialized = JSON.stringify(normalized);
  localStorage.setItem(accountKey(did), serialized);
  localStorage.setItem(LAST_PREFERENCES_KEY, serialized);
}

export function resolvedInterfaceLanguage(value: string) {
  if (value !== "auto") return value;
  return typeof navigator !== "undefined" ? (navigator.language || "fr") : "fr";
}
