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

export const WORD_CATEGORIES: WordCategory[] = [
  {
    id: "greetings",
    name: "Greetings & Social",
    icon: "👋",
    words: [
      { word: "hello", label: "Hello" },
      { word: "hi", label: "Hi" },
      { word: "bye", label: "Bye" },
      { word: "goodbye", label: "Goodbye" },
      { word: "thank", label: "Thank You" },
      { word: "please", label: "Please" },
      { word: "sorry", label: "Sorry" },
      { word: "yes", label: "Yes" },
      { word: "no", label: "No" },
    ],
  },
  {
    id: "feelings",
    name: "Feelings & States",
    icon: "😊",
    words: [
      { word: "happy", label: "Happy" },
      { word: "sad", label: "Sad" },
      { word: "angry", label: "Angry" },
      { word: "tired", label: "Tired" },
      { word: "sick", label: "Sick" },
      { word: "good", label: "Good" },
      { word: "bad", label: "Bad" },
      { word: "cold", label: "Cold" },
      { word: "hot", label: "Hot" },
      { word: "awake", label: "Awake" },
      { word: "loud", label: "Loud" },
    ],
  },
  {
    id: "actions",
    name: "Actions",
    icon: "🏃",
    words: [
      { word: "help", label: "Help" },
      { word: "want", label: "Want" },
      { word: "need", label: "Need" },
      { word: "go", label: "Go" },
      { word: "come", label: "Come" },
      { word: "stop", label: "Stop" },
      { word: "wait", label: "Wait" },
      { word: "eat", label: "Eat" },
      { word: "drink", label: "Drink" },
      { word: "work", label: "Work" },
      { word: "like", label: "Like" },
      { word: "love", label: "Love" },
      { word: "know", label: "Know" },
      { word: "think", label: "Think" },
      { word: "sign", label: "Sign" },
      { word: "blow", label: "Blow" },
      { word: "drop", label: "Drop" },
    ],
  },
  {
    id: "family",
    name: "Family & People",
    icon: "👨‍👩‍👧",
    words: [
      { word: "mother", label: "Mother" },
      { word: "father", label: "Father" },
      { word: "dad", label: "Dad" },
      { word: "grandpa", label: "Grandpa" },
      { word: "aunt", label: "Aunt" },
      { word: "friend", label: "Friend" },
      { word: "family", label: "Family" },
      { word: "man", label: "Man" },
      { word: "person", label: "Person" },
      { word: "fireman", label: "Fireman" },
    ],
  },
  {
    id: "animals",
    name: "Animals",
    icon: "🐾",
    words: [
      { word: "dog", label: "Dog" },
      { word: "cat", label: "Cat" },
      { word: "bird", label: "Bird" },
      { word: "animal", label: "Animal" },
      { word: "bee", label: "Bee" },
      { word: "alligator", label: "Alligator" },
      { word: "wolf", label: "Wolf" },
      { word: "zebra", label: "Zebra" },
    ],
  },
  {
    id: "food",
    name: "Food & Drink",
    icon: "🍎",
    words: [
      { word: "water", label: "Water" },
      { word: "food", label: "Food" },
      { word: "apple", label: "Apple" },
      { word: "snack", label: "Snack" },
      { word: "icecream", label: "Ice Cream" },
    ],
  },
  {
    id: "places",
    name: "Places",
    icon: "🏠",
    words: [
      { word: "home", label: "Home" },
      { word: "school", label: "School" },
      { word: "store", label: "Store" },
      { word: "bathroom", label: "Bathroom" },
      { word: "bedroom", label: "Bedroom" },
      { word: "backyard", label: "Backyard" },
      { word: "closet", label: "Closet" },
    ],
  },
  {
    id: "objects",
    name: "Objects",
    icon: "📦",
    words: [
      { word: "book", label: "Book" },
      { word: "car", label: "Car" },
      { word: "bus", label: "Bus" },
      { word: "airplane", label: "Airplane" },
      { word: "phone", label: "Phone" },
      { word: "TV", label: "TV" },
      { word: "hat", label: "Hat" },
      { word: "shoe", label: "Shoe" },
      { word: "lamp", label: "Lamp" },
      { word: "bed", label: "Bed" },
      { word: "tree", label: "Tree" },
      { word: "balloon", label: "Balloon" },
      { word: "mitten", label: "Mitten" },
      { word: "zipper", label: "Zipper" },
      { word: "vacuum", label: "Vacuum" },
    ],
  },
  {
    id: "time",
    name: "Time & Sequence",
    icon: "⏰",
    words: [
      { word: "today", label: "Today" },
      { word: "tomorrow", label: "Tomorrow" },
      { word: "yesterday", label: "Yesterday" },
      { word: "after", label: "After" },
      { word: "now", label: "Now" },
      { word: "time", label: "Time" },
    ],
  },
  {
    id: "descriptors",
    name: "Colors & More",
    icon: "🎨",
    words: [
      { word: "black", label: "Black" },
      { word: "white", label: "White" },
      { word: "yellow", label: "Yellow" },
      { word: "all", label: "All" },
      { word: "any", label: "Any" },
      { word: "another", label: "Another" },
      { word: "more", label: "More" },
      { word: "up", label: "Up" },
      { word: "down", label: "Down" },
      { word: "because", label: "Because" },
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
    id: "greetings",
    name: "Greetings",
    icon: "👋",
    sentences: [
      { id: "s1", words: ["hello", "friend"], display: "Hello friend" },
      { id: "s2", words: ["goodbye", "family"], display: "Goodbye family" },
      { id: "s3", words: ["bye", "go", "home"], display: "Bye go home" },
      { id: "s4", words: ["hello", "how"], display: "Hello how" },
      { id: "s5", words: ["thank", "help"], display: "Thank help" },
      { id: "s6", words: ["sorry", "help", "please"], display: "Sorry help please" },
    ],
  },
  {
    id: "requests",
    name: "Requests",
    icon: "🙏",
    sentences: [
      { id: "s7", words: ["water", "please"], display: "Water please" },
      { id: "s8", words: ["food", "please"], display: "Food please" },
      { id: "s9", words: ["help", "please"], display: "Help please" },
      { id: "s10", words: ["more", "water", "please"], display: "More water please" },
      { id: "s11", words: ["bathroom", "please"], display: "Bathroom please" },
      { id: "s12", words: ["repeat", "please"], display: "Repeat please" },
    ],
  },
  {
    id: "daily",
    name: "Daily Activities",
    icon: "☀️",
    sentences: [
      { id: "s13", words: ["eat", "food", "now"], display: "Eat food now" },
      { id: "s14", words: ["drink", "water", "now"], display: "Drink water now" },
      { id: "s15", words: ["go", "home", "now"], display: "Go home now" },
      { id: "s16", words: ["go", "school", "tomorrow"], display: "Go school tomorrow" },
      { id: "s17", words: ["go", "work", "now"], display: "Go work now" },
      { id: "s18", words: ["go", "store", "now"], display: "Go store now" },
    ],
  },
  {
    id: "family_s",
    name: "Family",
    icon: "👨‍👩‍👧",
    sentences: [
      { id: "s19", words: ["mother", "go", "home"], display: "Mother go home" },
      { id: "s20", words: ["father", "go", "work"], display: "Father go work" },
      { id: "s21", words: ["dad", "come", "home"], display: "Dad come home" },
      { id: "s22", words: ["family", "happy"], display: "Family happy" },
      { id: "s23", words: ["friend", "come", "home"], display: "Friend come home" },
      { id: "s24", words: ["mother", "help", "please"], display: "Mother help please" },
    ],
  },
  {
    id: "feelings_s",
    name: "Feelings",
    icon: "💭",
    sentences: [
      { id: "s25", words: ["happy", "today"], display: "Happy today" },
      { id: "s26", words: ["sad", "today"], display: "Sad today" },
      { id: "s27", words: ["tired", "now"], display: "Tired now" },
      { id: "s28", words: ["sick", "doctor", "please"], display: "Sick doctor please" },
      { id: "s29", words: ["cold", "home", "please"], display: "Cold home please" },
      { id: "s30", words: ["angry", "stop", "please"], display: "Angry stop please" },
    ],
  },
  {
    id: "questions_s",
    name: "Questions",
    icon: "❓",
    sentences: [
      { id: "s31", words: ["where", "bathroom"], display: "Where bathroom" },
      { id: "s32", words: ["where", "home"], display: "Where home" },
      { id: "s33", words: ["what", "time", "now"], display: "What time now" },
      { id: "s34", words: ["what", "name"], display: "What name" },
      { id: "s35", words: ["who", "person"], display: "Who person" },
      { id: "s36", words: ["when", "go", "home"], display: "When go home" },
    ],
  },
  {
    id: "commands_s",
    name: "Commands",
    icon: "📢",
    sentences: [
      { id: "s37", words: ["stop", "now"], display: "Stop now" },
      { id: "s38", words: ["come", "now"], display: "Come now" },
      { id: "s39", words: ["wait", "please"], display: "Wait please" },
      { id: "s40", words: ["more", "food"], display: "More food" },
      { id: "s41", words: ["all", "go", "home"], display: "All go home" },
      { id: "s42", words: ["want", "go", "home"], display: "Want go home" },
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
