export type QuizDifficulty = 1 | 2 | 3 | 4 | 5;

export type QuizFact = {
  theme: string;
  subject: string;
  answer: string;
  difficulty: QuizDifficulty;
};

export type QuizQuestion = {
  id: string;
  theme: string;
  difficulty: QuizDifficulty;
  question: string;
  options: string[];
  correctIndex: number;
};

const FACTS: QuizFact[] = [
  { theme: "Géographie", subject: "la capitale de la France", answer: "Paris", difficulty: 1 },
  { theme: "Géographie", subject: "la capitale de la Belgique", answer: "Bruxelles", difficulty: 1 },
  { theme: "Géographie", subject: "la capitale de l'Espagne", answer: "Madrid", difficulty: 1 },
  { theme: "Géographie", subject: "la capitale de l'Italie", answer: "Rome", difficulty: 1 },
  { theme: "Géographie", subject: "la capitale du Portugal", answer: "Lisbonne", difficulty: 2 },
  { theme: "Géographie", subject: "la capitale de l'Allemagne", answer: "Berlin", difficulty: 1 },
  { theme: "Géographie", subject: "la capitale de l'Autriche", answer: "Vienne", difficulty: 2 },
  { theme: "Géographie", subject: "la capitale de la Suisse", answer: "Berne", difficulty: 2 },
  { theme: "Géographie", subject: "la capitale du Canada", answer: "Ottawa", difficulty: 2 },
  { theme: "Géographie", subject: "la capitale de l'Australie", answer: "Canberra", difficulty: 2 },
  { theme: "Géographie", subject: "la capitale de la Nouvelle-Zélande", answer: "Wellington", difficulty: 3 },
  { theme: "Géographie", subject: "la capitale du Japon", answer: "Tokyo", difficulty: 1 },
  { theme: "Géographie", subject: "la capitale de la Corée du Sud", answer: "Séoul", difficulty: 2 },
  { theme: "Géographie", subject: "la capitale de l'Argentine", answer: "Buenos Aires", difficulty: 2 },
  { theme: "Géographie", subject: "la capitale du Maroc", answer: "Rabat", difficulty: 2 },
  { theme: "Géographie", subject: "le plus grand océan de la Terre", answer: "Océan Pacifique", difficulty: 1 },
  { theme: "Géographie", subject: "le plus haut sommet du monde", answer: "Everest", difficulty: 1 },
  { theme: "Géographie", subject: "le plus grand pays du monde par superficie", answer: "Russie", difficulty: 2 },

  { theme: "Histoire", subject: "l'année du début de la Première Guerre mondiale", answer: "1914", difficulty: 1 },
  { theme: "Histoire", subject: "l'année de la fin de la Seconde Guerre mondiale en Europe", answer: "1945", difficulty: 1 },
  { theme: "Histoire", subject: "l'empereur français vaincu à Waterloo", answer: "Napoléon Ier", difficulty: 1 },
  { theme: "Histoire", subject: "la civilisation ayant construit Machu Picchu", answer: "Incas", difficulty: 2 },
  { theme: "Histoire", subject: "la ville ensevelie par le Vésuve en 79", answer: "Pompéi", difficulty: 2 },
  { theme: "Histoire", subject: "le navigateur arrivé aux Amériques en 1492", answer: "Christophe Colomb", difficulty: 1 },
  { theme: "Histoire", subject: "la reine d'Égypte alliée à Jules César et Marc Antoine", answer: "Cléopâtre VII", difficulty: 2 },
  { theme: "Histoire", subject: "le mur tombé en 1989 et symbole de la guerre froide", answer: "Mur de Berlin", difficulty: 1 },
  { theme: "Histoire", subject: "l'ancienne cité grecque célèbre pour sa démocratie", answer: "Athènes", difficulty: 2 },
  { theme: "Histoire", subject: "le peuple antique ayant fondé Carthage", answer: "Phéniciens", difficulty: 4 },

  { theme: "Sciences", subject: "la planète surnommée la planète rouge", answer: "Mars", difficulty: 1 },
  { theme: "Sciences", subject: "la planète la plus proche du Soleil", answer: "Mercure", difficulty: 1 },
  { theme: "Sciences", subject: "la plus grande planète du Système solaire", answer: "Jupiter", difficulty: 1 },
  { theme: "Sciences", subject: "le gaz le plus abondant dans l'atmosphère terrestre", answer: "Azote", difficulty: 2 },
  { theme: "Sciences", subject: "le symbole chimique de l'or", answer: "Au", difficulty: 2 },
  { theme: "Sciences", subject: "le symbole chimique du fer", answer: "Fe", difficulty: 2 },
  { theme: "Sciences", subject: "l'unité SI de la force", answer: "Newton", difficulty: 3 },
  { theme: "Sciences", subject: "l'organe qui pompe le sang dans le corps humain", answer: "Cœur", difficulty: 1 },
  { theme: "Sciences", subject: "le processus par lequel les plantes utilisent la lumière pour produire de l'énergie", answer: "Photosynthèse", difficulty: 2 },
  { theme: "Sciences", subject: "la particule portant une charge électrique négative", answer: "Électron", difficulty: 3 },
  { theme: "Sciences", subject: "l'échelle utilisée pour mesurer l'acidité d'une solution", answer: "pH", difficulty: 2 },
  { theme: "Sciences", subject: "la vitesse de la lumière dans le vide, approximativement", answer: "300 000 km/s", difficulty: 3 },

  { theme: "Espace", subject: "le premier humain à marcher sur la Lune", answer: "Neil Armstrong", difficulty: 1 },
  { theme: "Espace", subject: "le premier satellite artificiel placé en orbite", answer: "Spoutnik 1", difficulty: 2 },
  { theme: "Espace", subject: "la galaxie contenant le Système solaire", answer: "Voie lactée", difficulty: 1 },
  { theme: "Espace", subject: "la planète connue pour ses anneaux très visibles", answer: "Saturne", difficulty: 1 },
  { theme: "Espace", subject: "le télescope spatial lancé en 2021 et successeur scientifique de Hubble", answer: "James Webb", difficulty: 2 },
  { theme: "Espace", subject: "le nom de l'étoile au centre du Système solaire", answer: "Soleil", difficulty: 1 },

  { theme: "Technologie", subject: "le système d'exploitation mobile développé par Google", answer: "Android", difficulty: 1 },
  { theme: "Technologie", subject: "le système d'exploitation de bureau développé par Microsoft", answer: "Windows", difficulty: 1 },
  { theme: "Technologie", subject: "le protocole sécurisé utilisé par la plupart des sites web modernes", answer: "HTTPS", difficulty: 2 },
  { theme: "Technologie", subject: "le langage principalement utilisé pour structurer une page web", answer: "HTML", difficulty: 1 },
  { theme: "Technologie", subject: "le langage utilisé pour mettre en forme visuellement une page web", answer: "CSS", difficulty: 1 },
  { theme: "Technologie", subject: "le langage créé par Brendan Eich pour le web", answer: "JavaScript", difficulty: 2 },
  { theme: "Technologie", subject: "l'unité correspondant à huit bits", answer: "Octet", difficulty: 2 },
  { theme: "Technologie", subject: "le système de gestion de versions distribué créé par Linus Torvalds", answer: "Git", difficulty: 3 },

  { theme: "Internet", subject: "le réseau social décentralisé utilisant l'AT Protocol et lancé par Bluesky PBLLC", answer: "Bluesky", difficulty: 2 },
  { theme: "Internet", subject: "le protocole de transfert utilisé pour envoyer des courriels", answer: "SMTP", difficulty: 3 },
  { theme: "Internet", subject: "le service qui traduit les noms de domaine en adresses IP", answer: "DNS", difficulty: 2 },
  { theme: "Internet", subject: "le sigle désignant une interface de programmation", answer: "API", difficulty: 1 },
  { theme: "Internet", subject: "le format d'échange de données textuel souvent utilisé par les API web", answer: "JSON", difficulty: 2 },

  { theme: "Cinéma", subject: "le réalisateur de Titanic et Avatar", answer: "James Cameron", difficulty: 1 },
  { theme: "Cinéma", subject: "le réalisateur de Jurassic Park", answer: "Steven Spielberg", difficulty: 1 },
  { theme: "Cinéma", subject: "le personnage principal de la saga Indiana Jones", answer: "Indiana Jones", difficulty: 1 },
  { theme: "Cinéma", subject: "le studio d'animation à l'origine de Toy Story", answer: "Pixar", difficulty: 1 },
  { theme: "Cinéma", subject: "le film dans lequel apparaît le personnage de Jack Sparrow", answer: "Pirates des Caraïbes", difficulty: 1 },
  { theme: "Cinéma", subject: "la saga mettant en scène Frodon Sacquet", answer: "Le Seigneur des anneaux", difficulty: 1 },

  { theme: "Musique", subject: "le groupe britannique ayant enregistré Bohemian Rhapsody", answer: "Queen", difficulty: 1 },
  { theme: "Musique", subject: "le compositeur de la Neuvième Symphonie dite avec l'Ode à la joie", answer: "Ludwig van Beethoven", difficulty: 2 },
  { theme: "Musique", subject: "le chanteur surnommé le King of Pop", answer: "Michael Jackson", difficulty: 1 },
  { theme: "Musique", subject: "le groupe suédois derrière Dancing Queen", answer: "ABBA", difficulty: 1 },
  { theme: "Musique", subject: "l'instrument comportant généralement 88 touches", answer: "Piano", difficulty: 1 },
  { theme: "Musique", subject: "la famille d'instruments à laquelle appartient le violon", answer: "Cordes", difficulty: 1 },

  { theme: "Jeux vidéo", subject: "le personnage moustachu emblématique de Nintendo", answer: "Mario", difficulty: 1 },
  { theme: "Jeux vidéo", subject: "la série de jeux dans laquelle apparaît Link", answer: "The Legend of Zelda", difficulty: 1 },
  { theme: "Jeux vidéo", subject: "le jeu de construction en blocs créé à l'origine par Markus Persson", answer: "Minecraft", difficulty: 1 },
  { theme: "Jeux vidéo", subject: "la console lancée par Sony en 1994 au Japon", answer: "PlayStation", difficulty: 2 },
  { theme: "Jeux vidéo", subject: "la franchise de Nintendo dans laquelle des créatures sont capturées dans des Poké Balls", answer: "Pokémon", difficulty: 1 },
  { theme: "Jeux vidéo", subject: "le jeu compétitif de Riot Games mettant en scène des champions sur une carte en trois voies", answer: "League of Legends", difficulty: 2 },

  { theme: "Sport", subject: "le nombre de joueurs d'une équipe de football sur le terrain au coup d'envoi", answer: "11", difficulty: 1 },
  { theme: "Sport", subject: "le sport dans lequel on utilise un volant", answer: "Badminton", difficulty: 1 },
  { theme: "Sport", subject: "le pays d'origine du judo", answer: "Japon", difficulty: 1 },
  { theme: "Sport", subject: "le tournoi de tennis joué sur terre battue à Paris", answer: "Roland-Garros", difficulty: 1 },
  { theme: "Sport", subject: "le nombre de points d'un lancer franc réussi au basket-ball", answer: "1", difficulty: 1 },
  { theme: "Sport", subject: "le sport associé au Tour de France", answer: "Cyclisme", difficulty: 1 },
  { theme: "Sport", subject: "le nombre d'anneaux sur le symbole olympique", answer: "5", difficulty: 1 },

  { theme: "Nature", subject: "le plus grand animal vivant actuellement", answer: "Baleine bleue", difficulty: 1 },
  { theme: "Nature", subject: "le mammifère terrestre le plus rapide", answer: "Guépard", difficulty: 1 },
  { theme: "Nature", subject: "le plus grand organe du corps humain", answer: "Peau", difficulty: 2 },
  { theme: "Nature", subject: "le phénomène par lequel l'eau liquide devient vapeur", answer: "Évaporation", difficulty: 1 },
  { theme: "Nature", subject: "le groupe d'animaux auquel appartient la grenouille", answer: "Amphibiens", difficulty: 2 },
  { theme: "Nature", subject: "le pigment vert essentiel à la photosynthèse", answer: "Chlorophylle", difficulty: 2 },

  { theme: "Cuisine", subject: "le pays généralement associé à l'origine de la pizza moderne", answer: "Italie", difficulty: 1 },
  { theme: "Cuisine", subject: "l'ingrédient principal du guacamole", answer: "Avocat", difficulty: 1 },
  { theme: "Cuisine", subject: "la céréale traditionnellement utilisée pour préparer le risotto", answer: "Riz", difficulty: 1 },
  { theme: "Cuisine", subject: "le fromage traditionnel du tiramisù classique", answer: "Mascarpone", difficulty: 1 },
  { theme: "Cuisine", subject: "l'épice principalement responsable de la couleur jaune du curcuma", answer: "Curcumine", difficulty: 3 },

  { theme: "Belgique", subject: "la capitale de la Belgique", answer: "Bruxelles", difficulty: 1 },
  { theme: "Belgique", subject: "la région belge dont Liège fait partie", answer: "Wallonie", difficulty: 1 },
  { theme: "Belgique", subject: "la ville belge connue pour son beffroi et ses canaux en Flandre-Occidentale", answer: "Bruges", difficulty: 2 },
  { theme: "Belgique", subject: "la monnaie utilisée en Belgique", answer: "Euro", difficulty: 1 },
  { theme: "Belgique", subject: "le fleuve qui traverse Liège", answer: "Meuse", difficulty: 2 },
  { theme: "Belgique", subject: "le siège principal des institutions de l'Union européenne en Belgique", answer: "Bruxelles", difficulty: 1 },

  { theme: "Europe", subject: "la monnaie commune utilisée par de nombreux pays de l'Union européenne", answer: "Euro", difficulty: 1 },
  { theme: "Europe", subject: "la ville où siège le Parlement européen pour ses sessions plénières", answer: "Strasbourg", difficulty: 2 },
  { theme: "Europe", subject: "le pays européen dont la capitale est Helsinki", answer: "Finlande", difficulty: 2 },
  { theme: "Europe", subject: "le pays européen dont la capitale est Ljubljana", answer: "Slovénie", difficulty: 3 },
  { theme: "Europe", subject: "le pays européen dont la capitale est Tallinn", answer: "Estonie", difficulty: 3 },
  { theme: "Europe", subject: "le pays européen dont la capitale est Zagreb", answer: "Croatie", difficulty: 2 },

  { theme: "Langues", subject: "la langue principalement parlée au Brésil", answer: "Portugais", difficulty: 1 },
  { theme: "Langues", subject: "la langue principalement parlée en Autriche", answer: "Allemand", difficulty: 1 },
  { theme: "Langues", subject: "l'alphabet utilisé pour écrire le grec moderne", answer: "Alphabet grec", difficulty: 1 },
  { theme: "Langues", subject: "la famille linguistique à laquelle appartient le français", answer: "Langues romanes", difficulty: 2 },
  { theme: "Langues", subject: "la langue officielle majoritaire aux Pays-Bas", answer: "Néerlandais", difficulty: 1 },
];

const QUESTION_TEMPLATES = [
  (subject: string) => `Quelle réponse correspond à ${subject} ?`,
  (subject: string) => `Peux-tu identifier ${subject} ?`,
  (subject: string) => `Dans ce quiz de culture générale, quelle proposition désigne ${subject} ?`,
  (subject: string) => `Choisis la bonne réponse pour ${subject}.`,
];

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function questionFromFact(fact: QuizFact, factIndex: number, seed: string, ordinal: number): QuizQuestion {
  const random = mulberry32(hashString(`${seed}:${factIndex}:${ordinal}`));
  const pool = FACTS.filter((candidate) => candidate.theme === fact.theme && candidate.answer !== fact.answer)
    .map((candidate) => candidate.answer);
  const fallbackPool = FACTS.filter((candidate) => candidate.answer !== fact.answer).map((candidate) => candidate.answer);
  const distractorPool = Array.from(new Set(pool.length >= 3 ? pool : fallbackPool));
  const distractors = shuffle(distractorPool, random).slice(0, 3);
  const options = shuffle([fact.answer, ...distractors], random);
  const template = QUESTION_TEMPLATES[Math.floor(random() * QUESTION_TEMPLATES.length)];

  return {
    id: `${hashString(`${seed}:${fact.theme}:${fact.subject}:${ordinal}`)}`,
    theme: fact.theme,
    difficulty: fact.difficulty,
    question: template(fact.subject),
    options,
    correctIndex: options.indexOf(fact.answer),
  };
}

export const QUIZ_THEMES = Array.from(new Set(FACTS.map((fact) => fact.theme))).sort();

// Chaque fait peut être combiné avec plusieurs formulations, permutations de réponses
// et groupes de distracteurs. Le nombre de variantes possibles dépasse largement 10 000.
export const ESTIMATED_QUESTION_VARIANTS = FACTS.reduce((total, fact) => {
  const sameTheme = new Set(FACTS.filter((candidate) => candidate.theme === fact.theme && candidate.answer !== fact.answer).map((candidate) => candidate.answer)).size;
  const poolSize = Math.max(sameTheme, 3);
  const combinations = poolSize >= 3 ? (poolSize * (poolSize - 1) * (poolSize - 2)) / 6 : 1;
  return total + combinations * QUESTION_TEMPLATES.length * 24;
}, 0);

export function createQuizQuestions(seed: string, themes: string[] = [], count = 15): QuizQuestion[] {
  const selectedThemes = themes.length > 0 ? new Set(themes) : null;
  const availableFacts = FACTS.filter((fact) => !selectedThemes || selectedThemes.has(fact.theme));
  const pool = availableFacts.length >= count ? availableFacts : FACTS;
  const random = mulberry32(hashString(seed));

  const difficultyPlan: QuizDifficulty[] = [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5];
  const chosen: QuizFact[] = [];
  const used = new Set<string>();

  for (let index = 0; index < count; index += 1) {
    const targetDifficulty = difficultyPlan[Math.min(index, difficultyPlan.length - 1)];
    const candidates = pool.filter((fact) => fact.difficulty <= targetDifficulty && !used.has(`${fact.theme}:${fact.subject}`));
    const fallback = pool.filter((fact) => !used.has(`${fact.theme}:${fact.subject}`));
    const source = candidates.length ? candidates : fallback.length ? fallback : pool;
    const picked = source[Math.floor(random() * source.length)];
    chosen.push(picked);
    used.add(`${picked.theme}:${picked.subject}`);
  }

  return chosen.map((fact, index) => questionFromFact(fact, FACTS.indexOf(fact), seed, index));
}
