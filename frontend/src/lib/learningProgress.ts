/** Learning progress types + pure helpers + guest localStorage (used when signed out). */

export const STORAGE_KEY = "signverse_learning_progress";

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
  lastActivityDate?: string;
  currentStreak?: number;
}

export function defaultProgress(): LearningProgress {
  return {
    completedAlphabets: [],
    completedWords: [],
    completedSentences: [],
    quizResults: [],
    starsEarned: 0,
    totalPracticeSeconds: 0,
    lastActivityDate: "",
    currentStreak: 0,
  };
}

export function cloneProgress(p: LearningProgress): LearningProgress {
  return {
    ...defaultProgress(),
    ...p,
    completedAlphabets: [...(p.completedAlphabets ?? [])],
    completedWords: [...(p.completedWords ?? [])],
    completedSentences: [...(p.completedSentences ?? [])],
    quizResults: [...(p.quizResults ?? [])].map((r) => ({ ...r })),
  };
}

export function normalizeProgress(raw: unknown): LearningProgress {
  if (!raw || typeof raw !== "object") return defaultProgress();
  try {
    return cloneProgress({ ...defaultProgress(), ...(raw as object) } as LearningProgress);
  } catch {
    return defaultProgress();
  }
}

export function clearGuestProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function toLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Mutates `p` — call on a clone only. */
export function applyStreakOnActivity(p: LearningProgress) {
  const today = toLocalYMD(new Date());
  const last = p.lastActivityDate ?? "";
  if (last === today) return;

  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = toLocalYMD(y);

  if (!last) {
    p.currentStreak = 1;
  } else if (last === yesterday) {
    p.currentStreak = (p.currentStreak ?? 0) + 1;
  } else {
    p.currentStreak = 1;
  }
  p.lastActivityDate = today;
}

export function isProgressEmpty(p: LearningProgress): boolean {
  return (
    p.completedAlphabets.length === 0 &&
    p.completedWords.length === 0 &&
    p.completedSentences.length === 0 &&
    p.quizResults.length === 0 &&
    (p.starsEarned ?? 0) === 0 &&
    (p.totalPracticeSeconds ?? 0) === 0
  );
}

/** Merge anonymous device progress into a user profile (e.g. first sign-in). */
export function mergeGuestIntoRemote(remote: LearningProgress, guest: LearningProgress): LearningProgress {
  const merged = cloneProgress(remote);
  merged.completedAlphabets = [...new Set([...merged.completedAlphabets, ...guest.completedAlphabets])];
  merged.completedWords = [...new Set([...merged.completedWords, ...guest.completedWords])];
  merged.completedSentences = [...new Set([...merged.completedSentences, ...guest.completedSentences])];
  merged.quizResults = [...merged.quizResults, ...guest.quizResults];
  merged.starsEarned = Math.max(merged.starsEarned, guest.starsEarned);
  merged.totalPracticeSeconds = merged.totalPracticeSeconds + guest.totalPracticeSeconds;
  const streak = Math.max(merged.currentStreak ?? 0, guest.currentStreak ?? 0);
  merged.currentStreak = streak;
  const dates = [merged.lastActivityDate, guest.lastActivityDate].filter(Boolean) as string[];
  merged.lastActivityDate = dates.sort().at(-1) ?? merged.lastActivityDate;
  return merged;
}

export function loadGuestProgress(): LearningProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return defaultProgress();
  }
}

/** Persist guest progress to disk (caller should apply streak first if needed). */
export function writeGuestProgress(p: LearningProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function saveGuestProgress(p: LearningProgress) {
  applyStreakOnActivity(p);
  writeGuestProgress(p);
}

export function getOverallAccuracy(p: LearningProgress): number {
  if (p.quizResults.length === 0) return 0;
  const totalScore = p.quizResults.reduce((a, r) => a + r.score, 0);
  const totalQuestions = p.quizResults.reduce((a, r) => a + r.total, 0);
  return totalQuestions > 0 ? totalScore / totalQuestions : 0;
}

export function getCompletedCount(p: LearningProgress): number {
  return p.completedAlphabets.length + p.completedWords.length + p.completedSentences.length;
}

export function getSignsLearnedCount(p: LearningProgress): number {
  return getCompletedCount(p);
}

export function getQuizzesCompletedCount(p: LearningProgress): number {
  return p.quizResults.length;
}

export function getDailyStreak(p: LearningProgress): number {
  return p.currentStreak ?? 0;
}

export function formatPracticeTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = (mins / 60).toFixed(1);
  return `${hrs} hrs`;
}
