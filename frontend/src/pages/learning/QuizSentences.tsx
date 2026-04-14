import { useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, RotateCcw, ArrowRight } from "lucide-react";
import { SENTENCE_CATEGORIES, shuffleArray } from "@/lib/learningData";
import { addQuizResult } from "@/lib/learningProgress";
import { verifySignSentence } from "@/lib/learningApi";
import SignRecorder from "./SignRecorder";

const QUIZ_COUNT = 3;

interface QuizSentence {
  display: string;
  words: string[];
}

function generateSentenceQuiz(): QuizSentence[] {
  const all = SENTENCE_CATEGORIES.flatMap((c) =>
    c.sentences.map((s) => ({ display: s.display, words: s.words }))
  );
  return shuffleArray(all).slice(0, QUIZ_COUNT);
}

export default function QuizSentences() {
  const navigate = useNavigate();
  const [sentences, setSentences] = useState<QuizSentence[]>(() => generateSentenceQuiz());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; message: string } | null>(null);
  const [showFinal, setShowFinal] = useState(false);

  const score = useMemo(() => answers.filter(Boolean).length, [answers]);
  const current = sentences[currentIdx];

  const handleRecordingComplete = useCallback(
    async (frames: string[]) => {
      setIsProcessing(true);
      setResult(null);
      try {
        const res = await verifySignSentence(frames, current.words);
        const msg = res.correct
          ? `Correct! Matched ${res.matchCount}/${res.totalExpected} words (${Math.round(res.confidence * 100)}% conf)`
          : `Matched ${res.matchCount}/${res.totalExpected} words. Detected: ${res.detectedWords.join(", ") || "none"}`;
        setResult({ correct: res.correct, message: msg });
        setAnswers((prev) => [...prev, res.correct]);
      } catch (e: any) {
        setResult({ correct: false, message: `Error: ${e.message}` });
        setAnswers((prev) => [...prev, false]);
      } finally {
        setIsProcessing(false);
      }
    },
    [current],
  );

  const goNext = () => {
    if (currentIdx < sentences.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setResult(null);
    } else {
      const finalScore = answers.filter(Boolean).length;
      addQuizResult({ score: finalScore, total: sentences.length, date: new Date().toISOString(), mode: "sentences" });
      setShowFinal(true);
    }
  };

  const restart = () => {
    setSentences(generateSentenceQuiz());
    setCurrentIdx(0);
    setAnswers([]);
    setResult(null);
    setShowFinal(false);
    setIsProcessing(false);
  };

  if (showFinal) {
    const pct = Math.round((score / sentences.length) * 100);
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <header className="border-b border-gray-800 bg-gray-950/90">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-white flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">Results</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-6 max-w-md">
            <Trophy className={`w-20 h-20 mx-auto ${pct >= 80 ? "text-yellow-400" : pct >= 50 ? "text-gray-300" : "text-red-400"}`} />
            <h2 className="text-4xl font-bold">{score}/{sentences.length}</h2>
            <p className="text-gray-400">
              {pct >= 80 ? "Incredible! You've mastered ASL sentences!" : pct >= 50 ? "Nice work on sentences!" : "Sentences are tough — keep at it!"}
            </p>
            <div className="w-full bg-gray-800 rounded-full h-3">
              <div className={`h-3 rounded-full transition-all duration-1000 ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex gap-3">
              <button onClick={restart} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 font-semibold flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Try Again
              </button>
              <Link to="/learning/quiz" replace className="flex-1 py-3 rounded-xl border border-white/10 font-semibold text-center hover:bg-white/5">
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
            className="text-gray-400 hover:text-white flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Quiz</span>
          </button>
          <h1 className="text-lg font-bold">Sentence Quiz</h1>
          <span className="ml-auto text-sm text-gray-400">{currentIdx + 1}/{sentences.length}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div className="bg-red-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(currentIdx / sentences.length) * 100}%` }} />
        </div>

        <div className="text-center space-y-3">
          <p className="text-gray-400 text-sm">Sign the following sentence:</p>
          <p className="text-3xl font-bold text-red-400">"{current.display}"</p>
          <div className="flex flex-wrap justify-center gap-2">
            {current.words.map((w, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/20">
                {w}
              </span>
            ))}
          </div>
          <p className="text-gray-500 text-xs">Sign each word clearly with brief pauses between them</p>
        </div>

        <div className="flex justify-center">
          <SignRecorder
            onRecordingComplete={handleRecordingComplete}
            isProcessing={isProcessing}
            result={result}
            disabled={answers.length > currentIdx}
          />
        </div>

        {answers.length > currentIdx && (
          <div className="flex justify-center">
            <button onClick={goNext} className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 font-medium text-sm flex items-center gap-2 transition-all">
              {currentIdx < sentences.length - 1 ? <>Next Sentence <ArrowRight className="w-4 h-4" /></> : <>See Results <Trophy className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        <div className="flex justify-center gap-2">
          {sentences.map((_, i) => (
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
