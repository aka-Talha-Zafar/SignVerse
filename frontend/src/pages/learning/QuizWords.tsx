import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, RotateCcw, ArrowRight } from "lucide-react";
import { shuffleArray, getAllWords } from "@/lib/learningData";
import { addQuizResult } from "@/lib/learningProgress";
import { verifySignRecording } from "@/lib/learningApi";
import SignRecorder from "./SignRecorder";

const QUIZ_COUNT = 5;

function generateWordQuiz(): string[] {
  return shuffleArray(getAllWords()).slice(0, QUIZ_COUNT);
}

export default function QuizWords() {
  const [words, setWords] = useState<string[]>(() => generateWordQuiz());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; message: string } | null>(null);
  const [showFinal, setShowFinal] = useState(false);

  const score = useMemo(() => answers.filter(Boolean).length, [answers]);
  const currentWord = words[currentIdx];

  const handleRecordingComplete = useCallback(
    async (frames: string[]) => {
      setIsProcessing(true);
      setResult(null);
      try {
        const res = await verifySignRecording(frames, currentWord);
        const correct = res.correct;
        const msg = correct
          ? `Correct! Detected "${res.detectedSign}" (${Math.round(res.confidence * 100)}% confidence)`
          : `Incorrect. Detected "${res.detectedSign}" instead of "${currentWord}"`;
        setResult({ correct, message: msg });
        setAnswers((prev) => [...prev, correct]);
      } catch (e: any) {
        setResult({ correct: false, message: `Error: ${e.message}` });
        setAnswers((prev) => [...prev, false]);
      } finally {
        setIsProcessing(false);
      }
    },
    [currentWord],
  );

  const goNext = () => {
    if (currentIdx < words.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setResult(null);
    } else {
      const finalScore = answers.filter(Boolean).length;
      addQuizResult({ score: finalScore, total: words.length, date: new Date().toISOString(), mode: "words" });
      setShowFinal(true);
    }
  };

  const restart = () => {
    setWords(generateWordQuiz());
    setCurrentIdx(0);
    setAnswers([]);
    setResult(null);
    setShowFinal(false);
    setIsProcessing(false);
  };

  if (showFinal) {
    const pct = Math.round((score / words.length) * 100);
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <header className="border-b border-gray-800 bg-gray-950/90">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
            <Link to="/learning/quiz" className="text-gray-400 hover:text-white flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold">Results</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-6 max-w-md">
            <Trophy className={`w-20 h-20 mx-auto ${pct >= 80 ? "text-yellow-400" : pct >= 50 ? "text-gray-300" : "text-red-400"}`} />
            <h2 className="text-4xl font-bold">{score}/{words.length}</h2>
            <p className="text-gray-400">
              {pct >= 80 ? "Amazing signing skills!" : pct >= 50 ? "Good effort! Keep practicing." : "Don't give up — practice more!"}
            </p>
            <div className="w-full bg-gray-800 rounded-full h-3">
              <div className={`h-3 rounded-full transition-all duration-1000 ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex gap-3">
              <button onClick={restart} className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 font-semibold flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Try Again
              </button>
              <Link to="/learning/quiz" className="flex-1 py-3 rounded-xl border border-white/10 font-semibold text-center hover:bg-white/5">
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
          <Link to="/learning/quiz" className="text-gray-400 hover:text-white flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Quiz</span>
          </Link>
          <h1 className="text-lg font-bold">Word Quiz</h1>
          <span className="ml-auto text-sm text-gray-400">{currentIdx + 1}/{words.length}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div className="bg-amber-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(currentIdx / words.length) * 100}%` }} />
        </div>

        <div className="text-center space-y-2">
          <p className="text-gray-400 text-sm">Perform the ASL sign for:</p>
          <p className="text-4xl font-bold text-amber-400">"{currentWord}"</p>
          <p className="text-gray-500 text-xs">Start camera, record your sign, then press Done</p>
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
            <button onClick={goNext} className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 font-medium text-sm flex items-center gap-2 transition-all">
              {currentIdx < words.length - 1 ? <>Next Question <ArrowRight className="w-4 h-4" /></> : <>See Results <Trophy className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        <div className="flex justify-center gap-2">
          {words.map((_, i) => (
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
