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
 * Word-level practice (Medium).
 * Only includes glosses with high confidence of clean avatar rendering.
 * Criteria: large distinct movement, present in Google ASL Signs 250 dataset,
 * confirmed absent from the problematic-word list (hi, goodbye, sorry, angry,
 * tired, want, wait, love, dad, friend, dog, animal, zebra, home, backyard, bus).
 */
export const WORD_CATEGORIES: WordCategory[] = [
  {
    id: "greetings",
    name: "Greetings & Social",
    icon: "👋",
    words: [
      { word: "hello", label: "Hello" },
      { word: "bye", label: "Bye" },
      { word: "thank", label: "Thank You" },
      { word: "please", label: "Please" },
      { word: "yes", label: "Yes" },
      { word: "no", label: "No" },
      { word: "help", label: "Help" },
      { word: "name", label: "Name" },
    ],
  },
  {
    id: "feelings",
    name: "Feelings & States",
    icon: "😊",
    words: [
      { word: "happy", label: "Happy" },
      { word: "sad", label: "Sad" },
      { word: "sick", label: "Sick" },
      { word: "good", label: "Good" },
      { word: "bad", label: "Bad" },
      { word: "cold", label: "Cold" },
      { word: "hot", label: "Hot" },
      { word: "awake", label: "Awake" },
      { word: "loud", label: "Loud" },
      { word: "cute", label: "Cute" },
    ],
  },
  {
    id: "actions",
    name: "Actions",
    icon: "🏃",
    words: [
      { word: "need", label: "Need" },
      { word: "go", label: "Go" },
      { word: "come", label: "Come" },
      { word: "stop", label: "Stop" },
      { word: "eat", label: "Eat" },
      { word: "drink", label: "Drink" },
      { word: "work", label: "Work" },
      { word: "like", label: "Like" },
      { word: "know", label: "Know" },
      { word: "think", label: "Think" },
      { word: "sign", label: "Sign" },
      { word: "blow", label: "Blow" },
      { word: "drop", label: "Drop" },
      { word: "swim", label: "Swim" },
      { word: "sit", label: "Sit" },
      { word: "dance", label: "Dance" },
      { word: "walk", label: "Walk" },
      { word: "throw", label: "Throw" },
      { word: "jump", label: "Jump" },
      { word: "fall", label: "Fall" },
    ],
  },
  {
    id: "family",
    name: "Family & People",
    icon: "👨‍👩‍👧",
    words: [
      { word: "mother", label: "Mother" },
      { word: "father", label: "Father" },
      { word: "grandpa", label: "Grandpa" },
      { word: "sister", label: "Sister" },
      { word: "brother", label: "Brother" },
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
      { word: "cat", label: "Cat" },
      { word: "bird", label: "Bird" },
      { word: "bee", label: "Bee" },
      { word: "rabbit", label: "Rabbit" },
      { word: "alligator", label: "Alligator" },
      { word: "wolf", label: "Wolf" },
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
      { word: "banana", label: "Banana" },
      { word: "cookie", label: "Cookie" },
      { word: "snack", label: "Snack" },
      { word: "icecream", label: "Ice Cream" },
    ],
  },
  {
    id: "places",
    name: "Places",
    icon: "🏠",
    words: [
      { word: "school", label: "School" },
      { word: "store", label: "Store" },
      { word: "bathroom", label: "Bathroom" },
      { word: "bedroom", label: "Bedroom" },
      { word: "closet", label: "Closet" },
      { word: "kitchen", label: "Kitchen" },
    ],
  },
  {
    id: "objects",
    name: "Objects",
    icon: "📦",
    words: [
      { word: "book", label: "Book" },
      { word: "car", label: "Car" },
      { word: "airplane", label: "Airplane" },
      { word: "phone", label: "Phone" },
      { word: "TV", label: "TV" },
      { word: "hat", label: "Hat" },
      { word: "shoe", label: "Shoe" },
      { word: "lamp", label: "Lamp" },
      { word: "bed", label: "Bed" },
      { word: "tree", label: "Tree" },
      { word: "ball", label: "Ball" },
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
    id: "colors",
    name: "Colors",
    icon: "🎨",
    words: [
      { word: "red", label: "Red" },
      { word: "blue", label: "Blue" },
      { word: "yellow", label: "Yellow" },
      { word: "purple", label: "Purple" },
      { word: "black", label: "Black" },
      { word: "white", label: "White" },
      { word: "pink", label: "Pink" },
    ],
  },
  {
    id: "descriptors",
    name: "Describing Words",
    icon: "✏️",
    words: [
      { word: "big", label: "Big" },
      { word: "small", label: "Small" },
      { word: "fast", label: "Fast" },
      { word: "slow", label: "Slow" },
      { word: "all", label: "All" },
      { word: "any", label: "Any" },
      { word: "another", label: "Another" },
      { word: "more", label: "More" },
      { word: "up", label: "Up" },
      { word: "down", label: "Down" },
      { word: "because", label: "Because" },
      { word: "new", label: "New" },
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

/**
 * Sentence-level practice (Hard).
 * All display strings use commas or natural phrasing — no hyphens or dashes.
 * All word arrays use only confirmed-working glosses from the database.
 * Banned words (hi, goodbye, sorry, angry, tired, want, wait, love, dad, friend,
 * dog, animal, zebra, home, backyard, bus) are excluded from all sentences.
 */
export const SENTENCE_CATEGORIES: SentenceCategory[] = [
  {
    id: "greetings",
    name: "Greetings",
    icon: "👋",
    sentences: [
      { id: "s1",  words: ["hello", "family"],          display: "Hello, family" },
      { id: "s2",  words: ["bye", "family"],             display: "Bye, family" },
      { id: "s3",  words: ["bye", "go", "school"],       display: "Bye, going to school" },
      { id: "s4",  words: ["thank", "please"],           display: "Thank you, please" },
      { id: "s5",  words: ["thank", "mother"],           display: "Thank you, mother" },
      { id: "s6",  words: ["please", "help"],            display: "Please help" },
    ],
  },
  {
    id: "requests",
    name: "Requests",
    icon: "🙏",
    sentences: [
      { id: "s7",  words: ["water", "please"],           display: "Water, please" },
      { id: "s8",  words: ["food", "please"],            display: "Food, please" },
      { id: "s9",  words: ["help", "please"],            display: "Help, please" },
      { id: "s10", words: ["more", "water", "please"],   display: "More water, please" },
      { id: "s11", words: ["bathroom", "please"],        display: "Bathroom, please" },
      { id: "s12", words: ["sign", "please"],            display: "Please sign" },
    ],
  },
  {
    id: "daily",
    name: "Daily Activities",
    icon: "☀️",
    sentences: [
      { id: "s13", words: ["eat", "food", "now"],        display: "Eat food now" },
      { id: "s14", words: ["drink", "water", "now"],     display: "Drink water now" },
      { id: "s15", words: ["go", "school", "now"],       display: "Go to school now" },
      { id: "s16", words: ["go", "school", "tomorrow"],  display: "Go to school tomorrow" },
      { id: "s17", words: ["go", "work", "now"],         display: "Go to work now" },
      { id: "s18", words: ["go", "store", "now"],        display: "Go to the store now" },
      { id: "s19", words: ["walk", "now", "please"],      display: "Walk now, please" },
      { id: "s20", words: ["like", "book"],              display: "Like this book" },
      { id: "s21", words: ["eat", "apple", "now"],       display: "Eat an apple now" },
      { id: "s22", words: ["eat", "snack", "please"],    display: "Eat a snack, please" },
    ],
  },
  {
    id: "family_s",
    name: "Family",
    icon: "👨‍👩‍👧",
    sentences: [
      { id: "s23", words: ["mother", "go", "store"],     display: "Mother, go to the store" },
      { id: "s24", words: ["father", "go", "work"],      display: "Father, go to work" },
      { id: "s25", words: ["mother", "come", "school"],  display: "Mother, come to school" },
      { id: "s26", words: ["family", "happy"],           display: "Family is happy" },
      { id: "s27", words: ["mother", "help", "please"],  display: "Mother, help please" },
      { id: "s28", words: ["father", "come", "now"],      display: "Father, come now" },
      { id: "s29", words: ["sister", "come", "now"],     display: "Sister, come now" },
      { id: "s30", words: ["brother", "go", "school"],   display: "Brother, go to school" },
    ],
  },
  {
    id: "feelings_s",
    name: "Feelings",
    icon: "💭",
    sentences: [
      { id: "s31", words: ["happy", "today"],            display: "Happy today" },
      { id: "s32", words: ["sad", "today"],              display: "Sad today" },
      { id: "s33", words: ["sick", "now"],               display: "Sick now" },
      { id: "s34", words: ["sick", "help", "please"],    display: "Sick, help please" },
      { id: "s35", words: ["cold", "bed", "please"],     display: "Cold, bed please" },
      { id: "s36", words: ["bad", "stop", "please"],     display: "Bad, stop please" },
      { id: "s37", words: ["cold", "now"],               display: "Cold now" },
      { id: "s38", words: ["eat", "food", "please"],    display: "Eat food, please" },
    ],
  },
  {
    id: "questions_s",
    name: "Questions",
    icon: "❓",
    sentences: [
      { id: "s39", words: ["where", "bathroom"],         display: "Where is the bathroom?" },
      { id: "s40", words: ["where", "school"],           display: "Where is school?" },
      { id: "s41", words: ["what", "time", "now"],       display: "What time is it now?" },
      { id: "s42", words: ["what", "name"],              display: "What is your name?" },
      { id: "s43", words: ["who", "person"],             display: "Who is that person?" },
      { id: "s44", words: ["when", "go", "school"],      display: "When do we go to school?" },
    ],
  },
  {
    id: "commands_s",
    name: "Commands",
    icon: "📢",
    sentences: [
      { id: "s45", words: ["stop", "now"],               display: "Stop now" },
      { id: "s46", words: ["come", "now"],               display: "Come now" },
      { id: "s47", words: ["come", "please"],            display: "Come, please" },
      { id: "s48", words: ["more", "food"],              display: "More food" },
      { id: "s49", words: ["all", "go", "school"],       display: "We all go to school" },
      { id: "s50", words: ["need", "go", "school"],      display: "Need to go to school" },
      { id: "s51", words: ["sit", "please"],             display: "Sit, please" },
      { id: "s52", words: ["walk", "fast"],              display: "Walk fast" },
      { id: "s53", words: ["come", "school", "now"],    display: "Come to school now" },
    ],
  },
  {
    id: "animals_s",
    name: "Animals",
    icon: "🐾",
    sentences: [
      { id: "s54", words: ["cat", "sit"],                display: "Cat, sit" },
      { id: "s55", words: ["swim", "fast", "now"],       display: "Swim fast now" },
      { id: "s56", words: ["rabbit", "come", "now"],    display: "Rabbit, come now" },
      { id: "s57", words: ["alligator", "big"],         display: "Alligator is big" },
      { id: "s58", words: ["bird", "go", "now"],         display: "Bird, go now" },
      { id: "s59", words: ["rabbit", "eat", "apple"],    display: "Rabbit eats an apple" },
    ],
  },
  {
    id: "food_s",
    name: "Food",
    icon: "🍎",
    sentences: [
      { id: "s60", words: ["more", "snack", "please"],   display: "More snack, please" },
      { id: "s61", words: ["eat", "icecream", "now"],   display: "Eat ice cream now" },
      { id: "s62", words: ["eat", "banana", "please"],   display: "Eat a banana, please" },
      { id: "s63", words: ["more", "apple", "please"],   display: "More apple, please" },
      { id: "s64", words: ["drink", "water", "please"],  display: "Drink water, please" },
      { id: "s65", words: ["eat", "cookie", "now"],      display: "Eat a cookie now" },
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
