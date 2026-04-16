import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebase } from "@/lib/firebase";
import {
  applyStreakOnActivity,
  cloneProgress,
  defaultProgress,
  isProgressEmpty,
  loadGuestProgress,
  mergeGuestIntoRemote,
  normalizeProgress,
  clearGuestProgress,
  writeGuestProgress,
  type LearningProgress,
  type QuizResult,
} from "@/lib/learningProgress";

type LearningProgressContextValue = {
  progress: LearningProgress;
  loading: boolean;
  markAlphabetCompleted: (letter: string) => void;
  markWordCompleted: (word: string) => void;
  markSentenceCompleted: (sentenceId: string) => void;
  addQuizResult: (result: QuizResult) => number;
  addPracticeTime: (seconds: number) => void;
};

const LearningProgressContext = createContext<LearningProgressContextValue | null>(null);

const guestMigratedKey = (uid: string) => `signverse_guest_merged_${uid}`;

export function LearningProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<LearningProgress>(defaultProgress());
  const [loading, setLoading] = useState(true);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const writeRemote = useCallback(async (uid: string, p: LearningProgress) => {
    const { db } = getFirebase();
    if (!db) return;
    await setDoc(
      doc(db, "users", uid),
      {
        learningProgress: cloneProgress(p),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }, []);

  const persist = useCallback(
    async (next: LearningProgress) => {
      const p = cloneProgress(next);
      applyStreakOnActivity(p);
      setProgress(p);
      progressRef.current = p;
      if (user) {
        const { db } = getFirebase();
        if (db) await writeRemote(user.uid, p);
      } else {
        writeGuestProgress(p);
      }
    },
    [user, writeRemote],
  );

  useEffect(() => {
    const { db } = getFirebase();
    if (!user || !db) {
      setProgress(loadGuestProgress());
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        const data = snap.data();
        let next = normalizeProgress(data?.learningProgress);

        if (isProgressEmpty(next) && !sessionStorage.getItem(guestMigratedKey(user.uid))) {
          const guest = loadGuestProgress();
          if (!isProgressEmpty(guest)) {
            sessionStorage.setItem(guestMigratedKey(user.uid), "1");
            const merged = mergeGuestIntoRemote(next, guest);
            await setDoc(
              ref,
              {
                learningProgress: cloneProgress(merged),
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            );
            clearGuestProgress();
            return;
          }
        }

        setProgress(next);
        setLoading(false);
      },
      () => {
        setProgress(loadGuestProgress());
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user?.uid]);

  const markAlphabetCompleted = useCallback(
    (letter: string) => {
      const base = cloneProgress(progressRef.current);
      if (base.completedAlphabets.includes(letter)) return;
      base.completedAlphabets.push(letter);
      void persist(base);
    },
    [persist],
  );

  const markWordCompleted = useCallback(
    (word: string) => {
      const base = cloneProgress(progressRef.current);
      if (base.completedWords.includes(word)) return;
      base.completedWords.push(word);
      void persist(base);
    },
    [persist],
  );

  const markSentenceCompleted = useCallback(
    (sentenceId: string) => {
      const base = cloneProgress(progressRef.current);
      if (base.completedSentences.includes(sentenceId)) return;
      base.completedSentences.push(sentenceId);
      void persist(base);
    },
    [persist],
  );

  const addQuizResult = useCallback(
    (result: QuizResult): number => {
      const base = cloneProgress(progressRef.current);
      base.quizResults.push(result);
      const stars = Math.floor((result.score / result.total) * 3);
      base.starsEarned += stars;
      void persist(base);
      return stars;
    },
    [persist],
  );

  const addPracticeTime = useCallback(
    (seconds: number) => {
      const base = cloneProgress(progressRef.current);
      base.totalPracticeSeconds += seconds;
      void persist(base);
    },
    [persist],
  );

  const value = useMemo<LearningProgressContextValue>(
    () => ({
      progress,
      loading,
      markAlphabetCompleted,
      markWordCompleted,
      markSentenceCompleted,
      addQuizResult,
      addPracticeTime,
    }),
    [
      progress,
      loading,
      markAlphabetCompleted,
      markWordCompleted,
      markSentenceCompleted,
      addQuizResult,
      addPracticeTime,
    ],
  );

  return (
    <LearningProgressContext.Provider value={value}>{children}</LearningProgressContext.Provider>
  );
}

export function useLearningProgress(): LearningProgressContextValue {
  const ctx = useContext(LearningProgressContext);
  if (!ctx) throw new Error("useLearningProgress must be used within LearningProgressProvider");
  return ctx;
}
