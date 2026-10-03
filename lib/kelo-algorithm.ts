import { getKeloContentPreferences, type KeloContentPreferences } from "@/lib/kelo-language-preferences";

export type KeloAlgorithmLevel = "very-low" | "medium" | "medium-addictive" | "addictive";

type FeedItem = {
  post?: {
    uri?: string;
    record?: {
      text?: string;
      langs?: string[];
      createdAt?: string;
    };
    likeCount?: number;
    repostCount?: number;
    replyCount?: number;
  };
};

const LEVELS: Record<KeloAlgorithmLevel, { interest: number; language: number; engagement: number; freshness: number; exploration: number }> = {
  "very-low": { interest: 5, language: 4, engagement: 1, freshness: 2, exploration: 4 },
  medium: { interest: 7, language: 5, engagement: 2, freshness: 3, exploration: 3 },
  "medium-addictive": { interest: 9, language: 6, engagement: 3, freshness: 4, exploration: 2 },
  addictive: { interest: 10, language: 7, engagement: 4, freshness: 5, exploration: 1 },
};

const INTEREST_KEYWORDS: Record<string, string[]> = {
  "Actualités": ["actualité", "actualités", "news", "breaking", "journal"],
  Art: ["art", "dessin", "peinture", "illustration", "photo", "photographie"],
  Cinéma: ["film", "cinéma", "movie", "série", "acteur", "actrice"],
  Culture: ["culture", "patrimoine", "festival", "tradition"],
  Éducation: ["éducation", "école", "université", "cours", "apprentissage"],
  Environnement: ["climat", "écologie", "environnement", "nature", "carbone"],
  Finance: ["finance", "bourse", "économie", "crypto", "investissement"],
  Gaming: ["gaming", "jeu vidéo", "jeux vidéo", "playstation", "xbox", "nintendo"],
  Histoire: ["histoire", "historique", "antiquité", "médiéval"],
  Humour: ["humour", "drôle", "blague", "mème", "meme"],
  Livres: ["livre", "livres", "roman", "lecture", "auteur"],
  Musique: ["musique", "concert", "chanson", "album", "artiste"],
  Politique: ["politique", "gouvernement", "élection", "parlement", "président"],
  Sciences: ["science", "sciences", "recherche", "physique", "chimie", "biologie"],
  Sport: ["sport", "football", "basket", "tennis", "vélo", "course"],
  Technologie: ["technologie", "tech", "ia", "intelligence artificielle", "logiciel", "ordinateur"],
  Voyage: ["voyage", "vacances", "tourisme", "destination", "avion"],
};

function getLevel(): KeloAlgorithmLevel {
  if (typeof window === "undefined") return "medium";
  const value = window.localStorage.getItem("kelo-algorithm-level") as KeloAlgorithmLevel | null;
  return value && value in LEVELS ? value : "medium";
}

function getSessionMinutes(): number {
  if (typeof window === "undefined") return 0;
  const key = "kelo-algorithm-session-start";
  const now = Date.now();
  const saved = Number(window.localStorage.getItem(key) || 0);
  if (!saved || now - saved > 12 * 60 * 60 * 1000) {
    window.localStorage.setItem(key, String(now));
    return 0;
  }
  return Math.max(0, (now - saved) / 60000);
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function scoreInterest(text: string, interests: string[]) {
  if (!interests.length) return 0;
  const normalized = normalize(text);
  return interests.reduce((score, interest) => {
    const keywords = INTEREST_KEYWORDS[interest] || [interest];
    return score + (keywords.some((keyword) => normalized.includes(normalize(keyword))) ? 1 : 0);
  }, 0);
}

function scoreLanguage(record: any, prefs: KeloContentPreferences) {
  const langs = Array.isArray(record?.langs) ? record.langs.map((v: unknown) => String(v).toLowerCase()) : [];
  const preferred = [
    ...(prefs.postLanguages || []),
    prefs.interfaceLanguage !== "auto" ? prefs.interfaceLanguage : "",
  ].filter(Boolean).map((v) => String(v).toLowerCase());
  if (!preferred.length || !langs.length) return 0;
  return langs.some((lang: string) => preferred.some((wanted) => lang === wanted || lang.startsWith(wanted.split("-")[0]))) ? 1 : 0;
}

export async function rankKeloFeed(items: FeedItem[], cursor?: string) {
  const prefs = getKeloContentPreferences();
  const level = getLevel();
  const weights = LEVELS[level];
  const sessionMinutes = getSessionMinutes();
  const refreshSeed = !cursor ? Math.floor(Math.random() * 1_000_000) : 0;

  const ranked = items.map((item, index) => {
    const record = item.post?.record || {};
    const text = String(record.text || "");
    const interestMatches = scoreInterest(text, prefs.interests);
    const languageMatch = scoreLanguage(record, prefs);
    const engagement = Math.log1p(
      Number(item.post?.likeCount || 0) +
      Number(item.post?.repostCount || 0) * 2 +
      Number(item.post?.replyCount || 0) * 1.5
    );
    const ageHours = Math.max(0, (Date.now() - new Date(record.createdAt || Date.now()).getTime()) / 3600000);
    const freshness = 1 / (1 + ageHours);
    const recentBoost = ageHours <= 12 ? (13 - ageHours) * (1.5 + weights.freshness * 0.35) : 0;
    const exploration = ((index * 17 + text.length * 13) % 100) / 100;
    const refreshJitter = refreshSeed ? (((index * 31 + text.length * 7 + refreshSeed) % 1000) / 1000) * 4 : 0;

    let score =
      interestMatches * weights.interest +
      languageMatch * weights.language +
      engagement * weights.engagement +
      freshness * weights.freshness +
      recentBoost +
      exploration * weights.exploration +
      refreshJitter;

    // Les niveaux restent pilotés par l'utilisateur. Après la durée indicative,
    // on augmente progressivement la diversité au lieu de chercher à prolonger
    // artificiellement la session.
    const targetMinutes = level === "very-low" ? 30 : level === "medium" ? 60 : level === "medium-addictive" ? 120 : Infinity;
    if (sessionMinutes > targetMinutes && Number.isFinite(targetMinutes)) {
      score += exploration * 4;
      score -= interestMatches * 1.5;
    }

    return { item, score };
  });

  ranked.sort((a, b) => b.score - a.score);
  return { items: ranked.map(({ item }) => item), cursor };
}
