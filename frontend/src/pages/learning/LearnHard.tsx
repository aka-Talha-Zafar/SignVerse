import { useMemo, useEffect, useCallback, useState } from "react";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import ProgressHeader from "./ProgressHeader";
import AvatarPlayer from "./AvatarPlayer";
import { SENTENCE_CATEGORIES, SentenceCategory, SentenceItem } from "@/lib/learningData";
import { useLearningProgress } from "@/contexts/LearningProgressContext";

export default function LearnHard() {
  const { progress, markSentenceCompleted } = useLearningProgress();
  const [searchParams, setSearchParams] = useSearchParams();
  const [completedSentences, setCompletedSentences] = useState<string[]>(() => [...progress.completedSentences]);

  useEffect(() => {
    setCompletedSentences([...progress.completedSentences]);
  }, [progress.completedSentences]);

  const catId = searchParams.get("cat");
  const sentenceId = searchParams.get("s");

  const selectedCategory = useMemo(
    () => (catId ? SENTENCE_CATEGORIES.find((c) => c.id === catId) ?? null : null),
    [catId],
  );

  const selectedSentence = useMemo(() => {
    if (!selectedCategory || !sentenceId) return null;
    return selectedCategory.sentences.find((s) => s.id === sentenceId) ?? null;
  }, [selectedCategory, sentenceId]);

  const setCategoryOnly = useCallback(
    (cat: SentenceCategory) => {
      setSearchParams({ cat: cat.id }, { replace: false });
    },
    [setSearchParams],
  );

  const openSentence = useCallback(
    (cat: SentenceCategory, s: SentenceItem) => {
      setSearchParams({ cat: cat.id, s: s.id }, { replace: false });
    },
    [setSearchParams],
  );

  const backToSentenceGrid = useCallback(() => {
    if (!selectedCategory) return;
    setSearchParams({ cat: selectedCategory.id }, { replace: true });
  }, [selectedCategory, setSearchParams]);

  const backToCategoryPicker = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const setSentenceInUrl = useCallback(
    (cat: SentenceCategory, s: SentenceItem, replace: boolean) => {
      setSearchParams({ cat: cat.id, s: s.id }, { replace });
    },
    [setSearchParams],
  );

  const handleMarkLearned = (id: string) => {
    markSentenceCompleted(id);
    setCompletedSentences((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const totalSentences = SENTENCE_CATEGORIES.reduce((a, c) => a + c.sentences.length, 0);
  const completedInCat = (cat: SentenceCategory) =>
    cat.sentences.filter((s) => completedSentences.includes(s.id)).length;

  if (selectedSentence && selectedCategory) {
    const idx = selectedCategory.sentences.indexOf(selectedSentence);
    const avatarText = selectedSentence.words.join(" ");

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <header className="sticky top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
            <button
              type="button"
              onClick={backToSentenceGrid}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">{selectedCategory.name}</span>
            </button>
            <h1 className="text-lg font-bold">Sentence</h1>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex flex-col items-center space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">Learn how to sign:</p>
              <span className="text-3xl font-bold text-red-400">{`"${selectedSentence.display}"`}</span>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {selectedSentence.words.map((w, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/20"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>

            <AvatarPlayer word={avatarText} autoPlay />

            <div className="flex gap-3 w-full max-w-sm">
              <button
                type="button"
                onClick={() => {
                  if (idx > 0) setSentenceInUrl(selectedCategory, selectedCategory.sentences[idx - 1], true);
                }}
                disabled={idx === 0}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-medium disabled:opacity-30 hover:bg-white/5 transition-all"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => {
                  handleMarkLearned(selectedSentence.id);
                  if (idx < selectedCategory.sentences.length - 1) {
                    setSentenceInUrl(selectedCategory, selectedCategory.sentences[idx + 1], true);
                  } else {
                    backToSentenceGrid();
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-medium transition-all"
              >
                {completedSentences.includes(selectedSentence.id) ? "Next" : "Mark Learned & Next"}
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
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Categories</span>
            </button>
            <h1 className="text-lg font-bold">
              {selectedCategory.icon} {selectedCategory.name}
            </h1>
            <span className="text-xs text-gray-400 ml-auto">
              {completedInCat(selectedCategory)}/{selectedCategory.sentences.length} learned
            </span>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="grid sm:grid-cols-2 gap-3">
            {selectedCategory.sentences.map((s) => {
              const done = completedSentences.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openSentence(selectedCategory, s)}
                  className={`relative rounded-xl border p-4 text-left transition-all duration-200 hover:scale-[1.01] ${
                    done
                      ? "border-red-500/30 bg-red-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/30"
                  }`}
                >
                  <p className="font-semibold text-white">{s.display}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.words.length} words</p>
                  {done && <CheckCircle className="absolute top-3 right-3 w-4 h-4 text-red-400" />}
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
      <ProgressHeader title="Hard — Sentences" backTo="/learning/learn" backLabel="Learn" backVariant="history" />

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            {completedSentences.length}/{totalSentences} sentences learned. Select a category.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SENTENCE_CATEGORIES.map((cat) => {
            const done = completedInCat(cat);
            const pct = Math.round((done / cat.sentences.length) * 100);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryOnly(cat)}
                className="group rounded-xl border border-white/10 bg-white/5 p-5 text-left hover:border-red-500/40 transition-all duration-200 hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <p className="font-semibold text-white group-hover:text-red-400 transition-colors">{cat.name}</p>
                    <p className="text-xs text-gray-400">{cat.sentences.length} sentences</p>
                  </div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div
                    className="bg-red-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {done}/{cat.sentences.length} completed
                </p>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
