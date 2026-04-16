import { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, RotateCcw, ArrowRight, ImageOff } from "lucide-react";
import { ALPHABETS, shuffleArray } from "@/lib/learningData";
import { useLearningProgress } from "@/contexts/LearningProgressContext";
import { getAlphabetImageUrl, getAlphabetImageUrlFallback } from "@/lib/learningApi";

const QUIZ_COUNT = 5;

function generateLetters(): string[] {
  return shuffleArray(ALPHABETS).slice(0, QUIZ_COUNT);
}

/** Pick 3 distractors distinct from `target` and from each other. */
function pickDistractors(target: string): string[] {
  const pool = ALPHABETS.filter((l) => l !== target);
  return shuffleArray(pool).slice(0, 3);
}

function buildChoices(target: string): string[] {
  return shuffleArray([target, ...pickDistractors(target)]);
}

function AlphabetMcqTile({
  letter,
  disabled,
  selected,
  correctLetter,
  revealed,
  onSelect,
}: {
  letter: string;
  disabled: boolean;
  selected: boolean;
  correctLetter: string;
  revealed: boolean;
  onSelect: () => void;
}) {
  const [loadTier, setLoadTier] = useState<0 | 1 | 2>(0);
  const [imgDead, setImgDead] = useState(false);

  useEffect(() => {
    setLoadTier(0);
    setImgDead(false);
  }, [letter]);

  const src = useMemo(() => {
    if (loadTier === 0) return getAlphabetImageUrl(letter);
    if (loadTier === 1)
      return `${import.meta.env.BASE_URL}learning/alphabet/${letter}.jpg`;
    return getAlphabetImageUrlFallback(letter);
  }, [letter, loadTier]);

  const wrongPick = revealed && selected && letter !== correctLetter;
  const showCorrect = revealed && letter === correctLetter;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`relative aspect-square rounded-2xl border-2 overflow-hidden transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 disabled:opacity-60 min-h-0 ${
        showCorrect
          ? "border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-950/40"
          : wrongPick
          ? "border-red-500 ring-2 ring-red-500/30 bg-red-950/20"
          : selected
          ? "border-white/40 bg-white/5"
          : "border-white/10 bg-gray-900/80 hover:border-emerald-500/40 hover:bg-gray-800/90"
      }`}
      aria-label="ASL sign choice"
    >
      {!imgDead ? (
        <div className="absolute inset-2 rounded-xl bg-gradient-to-b from-zinc-50 to-zinc-200 flex items-center justify-center overflow-hidden shadow-inner ring-1 ring-black/5">
          <img
            key={src}
            src={src}
            alt=""
            className="max-h-full max-w-full object-contain p-2"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => {
              if (loadTier === 0) setLoadTier(1);
              else if (loadTier === 1) setLoadTier(2);
              else setImgDead(true);
            }}
          />
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-600 p-2">
          <ImageOff className="w-10 h-10 opacity-40" />
          <span className="text-[10px] text-center leading-tight">Image unavailable</span>
        </div>
      )}
    </button>
  );
}

export default function QuizAlphabets() {
  const navigate = useNavigate();
  const { addQuizResult } = useLearningProgress();
  const [letters, setLetters] = useState<string[]>(() => generateLetters());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showFinal, setShowFinal] = useState(false);

  const [choices, setChoices] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; message: string } | null>(null);

  const resultsSavedRef = useRef(false);
  const answersRef = useRef<boolean[]>([]);

  const targetLetter = letters[currentIdx];
  const score = useMemo(() => answers.filter(Boolean).length, [answers]);
  answersRef.current = answers;

  useLayoutEffect(() => {
    if (!letters.length || currentIdx >= letters.length) return;
    const t = letters[currentIdx];
    setChoices(buildChoices(t));
    setPicked(null);
    setResult(null);
  }, [letters, currentIdx]);

  const handleSelect = useCallback(
    (letter: string) => {
      if (picked !== null) return;
      const correct = letter === targetLetter;
      setPicked(letter);
      setResult({
        correct,
        message: correct
          ? `Correct — that is the sign for letter ${targetLetter}.`
          : `Not this one. The sign for "${targetLetter}" was another option.`,
      });
      setAnswers((prev) => [...prev, correct]);
    },
    [picked, targetLetter],
  );

  const goNext = () => {
    if (currentIdx < letters.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      if (resultsSavedRef.current) return;
      resultsSavedRef.current = true;
      const finalScore = answersRef.current.filter(Boolean).length;
      addQuizResult({
        score: finalScore,
        total: letters.length,
        date: new Date().toISOString(),
        mode: "alphabets",
      });
      setShowFinal(true);
    }
  };

  const restart = () => {
    resultsSavedRef.current = false;
    const nextLetters = generateLetters();
    setLetters(nextLetters);
    setCurrentIdx(0);
    setAnswers([]);
    setShowFinal(false);
    setPicked(null);
    setResult(null);
  };

  const canAdvance = picked !== null;

  if (showFinal) {
    const pct = Math.round((score / letters.length) * 100);
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <header className="border-b border-gray-800 bg-gray-950/90 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Quiz</span>
            </button>
            <h1 className="text-lg font-bold">Results</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-6 max-w-md">
            <Trophy className={`w-20 h-20 mx-auto ${pct >= 80 ? "text-yellow-400" : pct >= 50 ? "text-gray-300" : "text-red-400"}`} />
            <h2 className="text-4xl font-bold">{score}/{letters.length}</h2>
            <p className="text-gray-400">
              {pct >= 80
                ? "Excellent! You are reading the manual alphabet well."
                : pct >= 50
                ? "Good progress — keep matching letters to their signs."
                : "Keep practicing — try Learn → Easy to study each letter first."}
            </p>
            <div className="w-full bg-gray-800 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-1000 ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={restart}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" /> Try Again
              </button>
              <Link to="/learning/quiz" replace className="flex-1 py-3 rounded-xl border border-white/10 font-semibold text-center hover:bg-white/5 transition-all">
                Back to Quiz
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Quiz</span>
          </button>
          <h1 className="text-lg font-bold">Alphabet Quiz</h1>
          <span className="ml-auto text-sm text-gray-400">
            {currentIdx + 1}/{letters.length}
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 space-y-6">
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentIdx / letters.length) * 100}%` }}
          />
        </div>

        <div className="text-center space-y-2">
          <p className="text-gray-400 text-sm">
            Which picture shows the ASL sign for letter {targetLetter}?
          </p>
          <p className="text-5xl font-bold text-emerald-400">{targetLetter}</p>
          <p className="text-gray-500 text-xs max-w-sm mx-auto leading-relaxed">
            Review the four images provided and tap the one that is correct.
          </p>
        </div>

        {choices.length === 4 ? (
          <div className="grid grid-cols-2 gap-3">
            {choices.map((letter) => (
              <AlphabetMcqTile
                key={`${currentIdx}-${letter}`}
                letter={letter}
                disabled={picked !== null}
                selected={picked === letter}
                correctLetter={targetLetter}
                revealed={picked !== null}
                onSelect={() => handleSelect(letter)}
              />
            ))}
          </div>
        ) : (
          <div className="flex justify-center py-16 text-gray-500 text-sm">Preparing question…</div>
        )}

        {result && (
          <div
            className={`rounded-xl p-4 border text-sm text-center ${
              result.correct ? "bg-emerald-900/25 border-emerald-700 text-emerald-200" : "bg-red-900/25 border-red-800 text-red-200"
            }`}
          >
            {result.message}
          </div>
        )}

        {canAdvance && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={goNext}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-medium text-sm flex items-center gap-2 transition-all"
            >
              {currentIdx < letters.length - 1 ? (
                <>
                  Next <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  See results <Trophy className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        <div className="flex justify-center gap-2 pt-2">
          {letters.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i < answers.length ? (answers[i] ? "bg-emerald-500" : "bg-red-500") : i === currentIdx ? "bg-white" : "bg-gray-700"
              }`}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
