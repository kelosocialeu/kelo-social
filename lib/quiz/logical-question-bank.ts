import {
  createQuizQuestions as createRawQuizQuestions,
  ESTIMATED_QUESTION_VARIANTS,
  QUIZ_THEMES,
  type QuizQuestion,
  type QuizDifficulty,
} from "./question-bank";

export { ESTIMATED_QUESTION_VARIANTS, QUIZ_THEMES };
export type { QuizQuestion, QuizDifficulty };

type AnswerKind =
  | "year" | "number" | "actor" | "director" | "character" | "studio" | "film" | "city" | "country"
  | "planet" | "person" | "composer" | "singer" | "band" | "instrument" | "sport" | "animal"
  | "chemicalSymbol" | "technology" | "language" | "food" | "currency" | "river" | "region" | "generic";

const POOLS: Record<Exclude<AnswerKind, "generic">, string[]> = {
  year: ["1789", "1815", "1914", "1918", "1939", "1945", "1969", "1989", "1991", "2001", "2012", "2021"],
  number: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  actor: ["Harrison Ford", "Tom Hanks", "Leonardo DiCaprio", "Denzel Washington", "Morgan Freeman", "Brad Pitt", "Matt Damon", "Keanu Reeves", "Meryl Streep", "Cate Blanchett", "Natalie Portman", "Viola Davis"],
  director: ["James Cameron", "Steven Spielberg", "Christopher Nolan", "Martin Scorsese", "Ridley Scott", "Greta Gerwig", "Sofia Coppola", "Denis Villeneuve", "Peter Jackson", "Quentin Tarantino"],
  character: ["Indiana Jones", "Jack Sparrow", "Frodon Sacquet", "Harry Potter", "Luke Skywalker", "Rocky Balboa", "Katniss Everdeen", "James Bond", "Wonder Woman", "Sherlock Holmes"],
  studio: ["Pixar", "DreamWorks Animation", "Studio Ghibli", "Walt Disney Animation Studios", "Illumination", "Sony Pictures Animation", "Laika", "Aardman Animations"],
  film: ["Titanic", "Avatar", "Jurassic Park", "Le Seigneur des anneaux", "Pirates des Caraïbes", "Inception", "Gladiator", "Interstellar", "Le Parrain", "Forrest Gump"],
  city: ["Paris", "Bruxelles", "Madrid", "Rome", "Lisbonne", "Berlin", "Vienne", "Berne", "Ottawa", "Canberra", "Tokyo", "Séoul", "Rabat", "Athènes", "Pompéi"],
  country: ["France", "Belgique", "Espagne", "Italie", "Portugal", "Allemagne", "Suisse", "Canada", "Australie", "Japon", "Maroc", "Argentine", "Russie", "Brésil"],
  planet: ["Mercure", "Vénus", "Terre", "Mars", "Jupiter", "Saturne", "Uranus", "Neptune"],
  person: ["Neil Armstrong", "Christophe Colomb", "Napoléon Ier", "Cléopâtre VII", "Galilée", "Marie Curie", "Albert Einstein", "Charles Darwin", "Jules César", "Marco Polo"],
  composer: ["Ludwig van Beethoven", "Wolfgang Amadeus Mozart", "Johann Sebastian Bach", "Frédéric Chopin", "Antonio Vivaldi", "Piotr Ilitch Tchaïkovski", "Claude Debussy", "Johannes Brahms"],
  singer: ["Michael Jackson", "Adele", "Beyoncé", "Stromae", "Ed Sheeran", "Lady Gaga", "Bruno Mars", "Céline Dion", "Elton John", "Whitney Houston"],
  band: ["Queen", "ABBA", "The Beatles", "Coldplay", "U2", "Muse", "Radiohead", "Metallica", "Imagine Dragons", "Daft Punk"],
  instrument: ["Piano", "Violon", "Guitare", "Violoncelle", "Flûte", "Trompette", "Clarinette", "Harpe", "Saxophone", "Batterie"],
  sport: ["Football", "Basket-ball", "Tennis", "Badminton", "Cyclisme", "Judo", "Natation", "Rugby", "Handball", "Volleyball"],
  animal: ["Baleine bleue", "Guépard", "Éléphant d'Afrique", "Girafe", "Tigre", "Dauphin", "Gorille", "Ours polaire", "Aigle royal", "Loup gris"],
  chemicalSymbol: ["H", "O", "C", "N", "Fe", "Au", "Ag", "Na", "K", "Ca", "Cu", "Zn"],
  technology: ["HTML", "CSS", "JavaScript", "Git", "Android", "Windows", "HTTPS", "SMTP", "DNS", "JSON", "API", "Linux"],
  language: ["Français", "Anglais", "Espagnol", "Italien", "Allemand", "Néerlandais", "Portugais", "Japonais", "Arabe", "Mandarin"],
  food: ["Riz", "Avocat", "Mascarpone", "Tomate", "Pomme de terre", "Blé", "Chocolat", "Mozzarella", "Pois chiches", "Citron"],
  currency: ["Euro", "Dollar américain", "Livre sterling", "Yen", "Franc suisse", "Dollar canadien", "Won sud-coréen", "Couronne suédoise"],
  river: ["Meuse", "Seine", "Rhin", "Danube", "Tamise", "Loire", "Rhône", "Escaut", "Tage", "Pô"],
  region: ["Wallonie", "Flandre", "Bruxelles-Capitale", "Bavière", "Catalogne", "Toscane", "Bretagne", "Andalousie", "Sicile", "Écosse"],
};

function kindFor(question: QuizQuestion): AnswerKind {
  const text = question.question.toLocaleLowerCase("fr-FR");
  const answer = question.options[question.correctIndex] || "";

  if (text.includes("année") || text.includes("en quelle année") || /^\d{4}$/.test(answer)) return "year";
  if (text.includes("nombre de") || text.includes("combien")) return "number";
  if (text.includes("acteur") || text.includes("actrice")) return "actor";
  if (text.includes("réalisateur") || text.includes("réalisatrice")) return "director";
  if (text.includes("personnage")) return "character";
  if (text.includes("studio")) return "studio";
  if (text.includes("film") || text.includes("saga") || text.includes("long-métrage")) return "film";
  if (text.includes("capitale") || text.includes("ville") || text.includes("cité")) return "city";
  if (text.includes("pays") || text.includes("nationalité")) return "country";
  if (text.includes("planète")) return "planet";
  if (text.includes("compositeur")) return "composer";
  if (text.includes("chanteur") || text.includes("chanteuse")) return "singer";
  if (text.includes("groupe") && (text.includes("musique") || text.includes("britannique") || text.includes("suédois"))) return "band";
  if (text.includes("instrument")) return "instrument";
  if (text.includes("sport")) return "sport";
  if (text.includes("animal") || text.includes("mammifère")) return "animal";
  if (text.includes("symbole chimique")) return "chemicalSymbol";
  if (text.includes("langue") || text.includes("langage parlé")) return "language";
  if (text.includes("ingrédient") || text.includes("céréale") || text.includes("fromage") || text.includes("épice")) return "food";
  if (text.includes("monnaie")) return "currency";
  if (text.includes("fleuve") || text.includes("rivière")) return "river";
  if (text.includes("région")) return "region";
  if (text.includes("empereur") || text.includes("reine") || text.includes("navigateur") || text.includes("humain") || text.includes("scientifique")) return "person";
  if (["Technologie", "Internet"].includes(question.theme)) return "technology";
  return "generic";
}

function hash(input: string) {
  let value = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function seededShuffle<T>(values: T[], seed: string): T[] {
  const output = [...values];
  let state = hash(seed) || 1;
  const random = () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

function logicalOptions(question: QuizQuestion): QuizQuestion {
  const correct = question.options[question.correctIndex];
  const kind = kindFor(question);
  if (!correct || kind === "generic") return question;

  const pool = POOLS[kind].filter((value) => value !== correct);
  if (pool.length < 3) return question;
  const distractors = seededShuffle(Array.from(new Set(pool)), `${question.id}:${kind}`).slice(0, 3);
  const options = seededShuffle([correct, ...distractors], `${question.id}:${kind}:answers`);

  return { ...question, options, correctIndex: options.indexOf(correct) };
}

export function createQuizQuestions(seed: string, themes: string[] = [], count = 15): QuizQuestion[] {
  return createRawQuizQuestions(seed, themes, count).map(logicalOptions);
}
