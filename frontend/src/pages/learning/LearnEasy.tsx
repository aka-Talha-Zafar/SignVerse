import { useState, useEffect, useMemo } from "react";
import { CheckCircle, X } from "lucide-react";
import ProgressHeader from "./ProgressHeader";
import { ALPHABETS, ASL_ALPHABET_DESCRIPTIONS } from "@/lib/learningData";
import { getProgress, markAlphabetCompleted } from "@/lib/learningProgress";
import { getAlphabetImageUrl, getAlphabetImageUrlFallback } from "@/lib/learningApi";

export default function LearnEasy() {
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [imgError, setImgError] = useState(false);
  /** 0 = learning API (dataset or bundled refs), 1 = frontend public/, 2 = Wikimedia SVG fallback */
  const [loadTier, setLoadTier] = useState<0 | 1 | 2>(0);
  const [imageAttribution, setImageAttribution] = useState<"none" | "commons">("none");

  useEffect(() => {
    setCompleted(getProgress().completedAlphabets);
  }, []);

  useEffect(() => {
    if (selectedLetter) {
      setLoadTier(0);
      setImgError(false);
      setImageAttribution("none");
    }
  }, [selectedLetter]);

  const imageSrc = useMemo(() => {
    if (!selectedLetter) return "";
    if (loadTier === 0) return getAlphabetImageUrl(selectedLetter);
    if (loadTier === 1)
      return `${import.meta.env.BASE_URL}learning/alphabet/${selectedLetter}.jpg`;
    return getAlphabetImageUrlFallback(selectedLetter);
  }, [selectedLetter, loadTier]);

  const handleLetterImageError = () => {
    if (loadTier === 0) setLoadTier(1);
    else if (loadTier === 1) setLoadTier(2);
    else setImgError(true);
  };

  const handleMarkLearned = (letter: string) => {
    markAlphabetCompleted(letter);
    setCompleted((prev) => (prev.includes(letter) ? prev : [...prev, letter]));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <ProgressHeader title="Easy — Alphabets" backTo="/learning/learn" backLabel="Learn" backVariant="history" />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            Select a letter to see how it looks in ASL. {completed.length}/{ALPHABETS.length} learned.
          </p>
          <div className="w-full bg-gray-800 rounded-full h-2 mt-3 max-w-md mx-auto">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(completed.length / ALPHABETS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-13 gap-2">
          {ALPHABETS.map((letter) => {
            const done = completed.includes(letter);
            return (
              <button
                key={letter}
                onClick={() => {
                  setSelectedLetter(letter);
                }}
                className={`relative aspect-square rounded-xl border text-xl font-bold flex items-center justify-center transition-all duration-200 hover:scale-105 ${
                  selectedLetter === letter
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/30"
                    : done
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-white/10 bg-white/5 text-white hover:border-white/30"
                }`}
              >
                {letter}
                {done && (
                  <CheckCircle className="absolute -top-1 -right-1 w-4 h-4 text-emerald-400 bg-gray-950 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {selectedLetter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 relative">
              <button
                onClick={() => setSelectedLetter(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-4">
                <span className="text-5xl font-bold text-emerald-400">{selectedLetter}</span>
                <p className="text-gray-400 text-sm mt-2">
                  {ASL_ALPHABET_DESCRIPTIONS[selectedLetter]}
                </p>
              </div>

              <div className="bg-gray-800 rounded-xl overflow-hidden aspect-square max-w-xs mx-auto mb-4 p-2">
                {!imgError ? (
                  <div className="h-full w-full rounded-lg bg-gradient-to-b from-zinc-50 to-zinc-200 flex items-center justify-center overflow-hidden ring-1 ring-black/5">
                  <img
                    key={imageSrc}
                    src={imageSrc}
                    alt={`ASL sign for letter ${selectedLetter}`}
                    className="max-h-full max-w-full object-contain p-2"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onLoad={() => {
                      if (loadTier === 2) setImageAttribution("commons");
                    }}
                    onError={handleLetterImageError}
                  />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-6">
                    <span className="text-8xl font-bold text-emerald-400/30 mb-4">{selectedLetter}</span>
                    <p className="text-sm text-center">
                      {ASL_ALPHABET_DESCRIPTIONS[selectedLetter]}
                    </p>
                    <p className="text-xs text-gray-600 mt-3 text-center">
                      No image could be loaded (API, optional files in public/learning/alphabet/, or public
                      reference). Check that the learning API is reachable and see INSTRUCTIONS in the Space
                      static/alphabet_refs folder for dataset or bundled photos.
                    </p>
                  </div>
                )}
              </div>
              {imageAttribution === "commons" && !imgError && (
                <p className="text-xs text-gray-600 text-center mb-4 max-w-xs mx-auto -mt-2">
                  Reference illustration: Wikimedia Commons &ldquo;Sign language {selectedLetter}.svg&rdquo;
                  (manual alphabet). For Kaggle-style training photos, bundle images on the API (see Space
                  static/alphabet_refs).
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const idx = ALPHABETS.indexOf(selectedLetter);
                    if (idx > 0) {
                      setSelectedLetter(ALPHABETS[idx - 1]);
                    }
                  }}
                  disabled={ALPHABETS.indexOf(selectedLetter) === 0}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-medium disabled:opacity-30 hover:bg-white/5 transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => {
                    handleMarkLearned(selectedLetter);
                    const idx = ALPHABETS.indexOf(selectedLetter);
                    if (idx < ALPHABETS.length - 1) {
                      setSelectedLetter(ALPHABETS[idx + 1]);
                    } else {
                      setSelectedLetter(null);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-medium transition-all"
                >
                  {completed.includes(selectedLetter) ? "Next" : "Mark Learned & Next"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
