import { useMemo, useEffect, useCallback, useState } from "react";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import ProgressHeader from "./ProgressHeader";
import AvatarPlayer from "./AvatarPlayer";
import { WORD_CATEGORIES, WordCategory, WordItem } from "@/lib/learningData";
import { useLearningProgress } from "@/contexts/LearningProgressContext";

export default function LearnMedium() {
  const { progress, markWordCompleted } = useLearningProgress();
  const [searchParams, setSearchParams] = useSearchParams();
  const [completedWords, setCompletedWords] = useState<string[]>(() => [...progress.completedWords]);

  useEffect(() => {
    setCompletedWords([...progress.completedWords]);
  }, [progress.completedWords]);

  const catId = searchParams.get("cat");
  const wordKey = searchParams.get("w");

  const selectedCategory = useMemo(
    () => (catId ? WORD_CATEGORIES.find((c) => c.id === catId) ?? null : null),
    [catId],
  );

  const selectedWord = useMemo(() => {
    if (!selectedCategory || !wordKey) return null;
    return selectedCategory.words.find((w) => w.word === wordKey) ?? null;
  }, [selectedCategory, wordKey]);

  const setCategoryOnly = useCallback(
    (cat: WordCategory) => {
      setSearchParams({ cat: cat.id }, { replace: false });
    },
    [setSearchParams],
  );

  const openWord = useCallback(
    (cat: WordCategory, w: WordItem) => {
      setSearchParams({ cat: cat.id, w: w.word }, { replace: false });
    },
    [setSearchParams],
  );

  /** Drop `w` from URL (same screen as category word grid). */
  const backToCategoryGrid = useCallback(() => {
    if (!selectedCategory) return;
    setSearchParams({ cat: selectedCategory.id }, { replace: true });
  }, [selectedCategory, setSearchParams]);

  /** Clear category — medium home with all categories. */
  const backToCategoryPicker = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const setWordInUrl = useCallback(
    (cat: WordCategory, w: WordItem, replace: boolean) => {
      setSearchParams({ cat: cat.id, w: w.word }, { replace });
    },
    [setSearchParams],
  );

  const handleMarkLearned = (word: string) => {
    markWordCompleted(word);
    setCompletedWords((prev) => (prev.includes(word) ? prev : [...prev, word]));
  };

  const totalWords = WORD_CATEGORIES.reduce((a, c) => a + c.words.length, 0);
  const completedInCat = (cat: WordCategory) =>
    cat.words.filter((w) => completedWords.includes(w.word)).length;

  if (selectedWord && selectedCategory) {
    const wordIdx = selectedCategory.words.indexOf(selectedWord);
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <header className="sticky top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
            <button
              type="button"
              onClick={backToCategoryGrid}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">{selectedCategory.name}</span>
            </button>
            <h1 className="text-lg font-bold">{selectedWord.label}</h1>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex flex-col items-center space-y-6">
            <div className="text-center">
              <span className="text-4xl font-bold text-amber-400">{selectedWord.label}</span>
              <p className="text-gray-400 text-sm mt-1">Watch the avatar perform this sign</p>
            </div>

            <AvatarPlayer word={selectedWord.word} autoPlay />

            <div className="flex gap-3 w-full max-w-sm">
              <button
                type="button"
                onClick={() => {
                  if (wordIdx > 0) setWordInUrl(selectedCategory, selectedCategory.words[wordIdx - 1], true);
                }}
                disabled={wordIdx === 0}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-medium disabled:opacity-30 hover:bg-white/5 transition-all"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => {
                  handleMarkLearned(selectedWord.word);
                  if (wordIdx < selectedCategory.words.length - 1) {
                    setWordInUrl(selectedCategory, selectedCategory.words[wordIdx + 1], true);
                  } else {
                    backToCategoryGrid();
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-sm font-medium transition-all"
              >
                {completedWords.includes(selectedWord.word) ? "Next" : "Mark Learned & Next"}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (selectedCategory) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <header className="sticky top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
            <button
              type="button"
              onClick={backToCategoryPicker}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Categories</span>
            </button>
            <h1 className="text-lg font-bold">
              {selectedCategory.icon} {selectedCategory.name}
            </h1>
            <span className="text-xs text-gray-400 ml-auto">
              {completedInCat(selectedCategory)}/{selectedCategory.words.length} learned
            </span>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {selectedCategory.words.map((w) => {
              const done = completedWords.includes(w.word);
              return (
                <button
                  key={w.word}
                  type="button"
                  onClick={() => openWord(selectedCategory, w)}
                  className={`relative rounded-xl border p-4 text-left transition-all duration-200 hover:scale-[1.02] ${
                    done
                      ? "border-amber-500/30 bg-amber-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/30"
                  }`}
                >
                  <p className="font-semibold text-white">{w.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{w.word}</p>
                  {done && <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-amber-400" />}
                </button>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <ProgressHeader title="Medium — Words" backTo="/learning/learn" backLabel="Learn" backVariant="history" />

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            {completedWords.length}/{totalWords} words learned. Select a category to start.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {WORD_CATEGORIES.map((cat) => {
            const done = completedInCat(cat);
            const pct = Math.round((done / cat.words.length) * 100);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryOnly(cat)}
                className="group rounded-xl border border-white/10 bg-white/5 p-5 text-left hover:border-amber-500/40 transition-all duration-200 hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <p className="font-semibold text-white group-hover:text-amber-400 transition-colors">{cat.name}</p>
                    <p className="text-xs text-gray-400">{cat.words.length} words</p>
                  </div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {done}/{cat.words.length} completed
                </p>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
