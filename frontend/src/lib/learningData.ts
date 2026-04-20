export const ALPHABETS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * Stable manual-alphabet illustrations (SVG) from Wikimedia Commons — used only when
 * the learning API has no Kaggle folder and no bundled JPEGs. See file pages for license.
 */
export const ASL_PUBLIC_REFERENCE_SVG: Record<string, string> = {
  A: "https://upload.wikimedia.org/wikipedia/commons/2/27/Sign_language_A.svg",
  B: "https://upload.wikimedia.org/wikipedia/commons/1/18/Sign_language_B.svg",
  C: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Sign_language_C.svg",
  D: "https://upload.wikimedia.org/wikipedia/commons/0/06/Sign_language_D.svg",
  E: "https://upload.wikimedia.org/wikipedia/commons/c/cd/Sign_language_E.svg",
  F: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Sign_language_F.svg",
  G: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Sign_language_G.svg",
  H: "https://upload.wikimedia.org/wikipedia/commons/9/97/Sign_language_H.svg",
  I: "https://upload.wikimedia.org/wikipedia/commons/1/10/Sign_language_I.svg",
  J: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Sign_language_J.svg",
  K: "https://upload.wikimedia.org/wikipedia/commons/9/97/Sign_language_K.svg",
  L: "https://upload.wikimedia.org/wikipedia/commons/d/d2/Sign_language_L.svg",
  M: "https://upload.wikimedia.org/wikipedia/commons/c/c4/Sign_language_M.svg",
  N: "https://upload.wikimedia.org/wikipedia/commons/e/e6/Sign_language_N.svg",
  O: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Sign_language_O.svg",
  P: "https://upload.wikimedia.org/wikipedia/commons/0/08/Sign_language_P.svg",
  Q: "https://upload.wikimedia.org/wikipedia/commons/3/34/Sign_language_Q.svg",
  R: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Sign_language_R.svg",
  S: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Sign_language_S.svg",
  T: "https://upload.wikimedia.org/wikipedia/commons/1/13/Sign_language_T.svg",
  U: "https://upload.wikimedia.org/wikipedia/commons/7/7c/Sign_language_U.svg",
  V: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Sign_language_V.svg",
  W: "https://upload.wikimedia.org/wikipedia/commons/8/83/Sign_language_W.svg",
  X: "https://upload.wikimedia.org/wikipedia/commons/b/b7/Sign_language_X.svg",
  Y: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Sign_language_Y.svg",
  Z: "https://upload.wikimedia.org/wikipedia/commons/0/0a/Sign_language_Z.svg",
};

export const ASL_ALPHABET_DESCRIPTIONS: Record<string, string> = {
  A: "Fist with thumb resting on the side",
  B: "Flat hand, fingers together, thumb tucked across palm",
  C: "Curved hand forming a C shape",
  D: "Index finger up, other fingers curled to touch thumb",
  E: "All fingertips curled down touching thumb",
  F: "Thumb and index touching in circle, other fingers spread",
  G: "Index and thumb pointing sideways, parallel",
  H: "Index and middle finger pointing sideways together",
  I: "Fist with pinky finger extended upward",
  J: "Pinky extended, hand traces a J motion",
  K: "Index up, middle finger angled, thumb between them",
  L: "Thumb and index finger forming an L shape",
  M: "Three fingers draped over the thumb in a fist",
  N: "Two fingers draped over the thumb in a fist",
  O: "All fingertips touching thumb forming an O",
  P: "Similar to K but hand points downward",
  Q: "Similar to G but hand points downward",
  R: "Index and middle finger crossed",
  S: "Fist with thumb wrapped over fingers",
  T: "Thumb tucked between index and middle finger",
  U: "Index and middle finger extended up together",
  V: "Index and middle finger spread in V shape",
  W: "Index, middle, and ring fingers spread upward",
  X: "Index finger hooked/bent at knuckle",
  Y: "Thumb and pinky extended, other fingers folded",
  Z: "Index finger traces a Z shape in the air",
};

export interface WordItem {
  word: string;
  label: string;
}

export interface WordCategory {
  id: string;
  name: string;
  icon: string;
  words: WordItem[];
}

/**
 * Curated word-level practice list — aligned with How2Sign-heavy gloss entries in
 * `database.json` so the avatar is more likely to animate cleanly.
 */
export const WORD_CATEGORIES: WordCategory[] = [
  {
    id: "greetings_social",
    name: "Greetings & politeness",
    icon: "👋",
    words: [
      { word: "hi", label: "Hi" },
      { word: "goodbye", label: "Goodbye" },
      { word: "sorry", label: "Sorry" },
    ],
  },
  {
    id: "feelings_actions",
    name: "Feelings & intentions",
    icon: "💭",
    words: [
      { word: "angry", label: "Angry" },
      { word: "tired", label: "Tired" },
      { word: "want", label: "Want" },
      { word: "wait", label: "Wait" },
      { word: "love", label: "Love" },
    ],
  },
  {
    id: "people",
    name: "Family & friends",
    icon: "👨‍👩‍👧",
    words: [
      { word: "dad", label: "Dad" },
      { word: "friend", label: "Friend" },
    ],
  },
  {
    id: "animals",
    name: "Animals",
    icon: "🐾",
    words: [
      { word: "dog", label: "Dog" },
      { word: "animal", label: "Animal" },
      { word: "zebra", label: "Zebra" },
    ],
  },
  {
    id: "places_travel",
    name: "Places & travel",
    icon: "🏠",
    words: [
      { word: "home", label: "Home" },
      { word: "backyard", label: "Backyard" },
      { word: "bus", label: "Bus" },
    ],
  },
];

export interface SentenceItem {
  id: string;
  words: string[];
  display: string;
}

export interface SentenceCategory {
  id: string;
  name: string;
  icon: string;
  sentences: SentenceItem[];
}

export const SENTENCE_CATEGORIES: SentenceCategory[] = [
  {
    id: "greetings_s",
    name: "Greetings & politeness",
    icon: "👋",
    sentences: [
      { id: "s1", words: ["hi", "friend"], display: "Hi, friend" },
      { id: "s2", words: ["goodbye", "family"], display: "Goodbye, family" },
      { id: "s3", words: ["sorry", "please"], display: "Sorry — please" },
      { id: "s4", words: ["love", "friend"], display: "Love, friend" },
    ],
  },
  {
    id: "feelings_s",
    name: "Feelings & requests",
    icon: "💬",
    sentences: [
      { id: "s5", words: ["angry", "stop", "please"], display: "Angry — stop, please" },
      { id: "s6", words: ["tired", "now"], display: "Tired now" },
      { id: "s7", words: ["wait", "please"], display: "Wait, please" },
      { id: "s8", words: ["want", "home"], display: "Want home" },
    ],
  },
  {
    id: "family_s",
    name: "Family & friends",
    icon: "👨‍👩‍👧",
    sentences: [
      { id: "s9", words: ["dad", "come", "home"], display: "Dad, come home" },
      { id: "s10", words: ["friend", "come", "home"], display: "Friend, come home" },
      { id: "s11", words: ["love", "dad"], display: "Love dad" },
    ],
  },
  {
    id: "animals_places",
    name: "Animals & places",
    icon: "🏠",
    sentences: [
      { id: "s12", words: ["dog", "home"], display: "Dog (at) home" },
      { id: "s13", words: ["animal", "backyard"], display: "Animal in the backyard" },
      { id: "s14", words: ["zebra", "animal"], display: "Zebra — animal" },
      { id: "s15", words: ["bus", "wait"], display: "Wait for the bus" },
    ],
  },
  {
    id: "time_phrases",
    name: "Everyday phrases",
    icon: "⏱️",
    sentences: [
      { id: "s16", words: ["come", "now"], display: "Come now" },
      { id: "s17", words: ["wait", "now"], display: "Wait now" },
      { id: "s18", words: ["go", "home", "now"], display: "Go home now" },
    ],
  },
];

export function getAllWords(): string[] {
  const words = new Set<string>();
  WORD_CATEGORIES.forEach((cat) => cat.words.forEach((w) => words.add(w.word)));
  return Array.from(words);
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
