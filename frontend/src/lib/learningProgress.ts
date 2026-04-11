const STORAGE_KEY = "signverse_learning_progress";

export interface QuizResult {
  score: number;
  total: number;
  date: string;
  mode: "alphabets" | "words" | "sentences";
}

export interface LearningProgress {
  completedAlphabets: string[];
  completedWords: string[];
  completedSentences: string[];
  quizResults: QuizResult[];
  starsEarned: number;
  totalPracticeSeconds: number;
}

function defaultProgress(): LearningProgress {
  return {
    completedAlphabets: [],
    completedWords: [],
    completedSentences: [],
    quizResults: [],
    starsEarned: 0,
    totalPracticeSeconds: 0,
  };
}

export function getProgress(): LearningProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    return { ...defaultProgress(), ...JSON.parse(raw) };
  } catch {
    return defaultProgress();
  }
}

function saveProgress(p: LearningProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function markAlphabetCompleted(letter: string) {
  const p = getProgress();
  if (!p.completedAlphabets.includes(letter)) {
    p.completedAlphabets.push(letter);
  }
  saveProgress(p);
}

export function markWordCompleted(word: string) {
  const p = getProgress();
  if (!p.completedWords.includes(word)) {
    p.completedWords.push(word);
  }
  saveProgress(p);
}

export function markSentenceCompleted(sentenceId: string) {
  const p = getProgress();
  if (!p.completedSentences.includes(sentenceId)) {
    p.completedSentences.push(sentenceId);
  }
  saveProgress(p);
}

export function addQuizResult(result: QuizResult) {
  const p = getProgress();
  p.quizResults.push(result);
  const stars = Math.floor(result.score / result.total * 3);
  p.starsEarned += stars;
  saveProgress(p);
  return stars;
}

export function addPracticeTime(seconds: number) {
  const p = getProgress();
  p.totalPracticeSeconds += seconds;
  saveProgress(p);
}

export function getOverallAccuracy(): number {
  const p = getProgress();
  if (p.quizResults.length === 0) return 0;
  const totalScore = p.quizResults.reduce((a, r) => a + r.score, 0);
  const totalQuestions = p.quizResults.reduce((a, r) => a + r.total, 0);
  return totalQuestions > 0 ? totalScore / totalQuestions : 0;
}

export function getCompletedCount(): number {
  const p = getProgress();
  return p.completedAlphabets.length + p.completedWords.length + p.completedSentences.length;
}

export function formatPracticeTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = (mins / 60).toFixed(1);
  return `${hrs} hrs`;
}
