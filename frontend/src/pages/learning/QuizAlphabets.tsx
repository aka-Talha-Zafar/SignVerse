import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, RotateCcw } from "lucide-react";
import { ALPHABETS, shuffleArray } from "@/lib/learningData";
import { addQuizResult } from "@/lib/learningProgress";
import { LEARNING_API_BASE } from "@/lib/learningApi";

interface Question {
  correctLetter: string;
  options: string[];
}

function generateQuestions(count: number): Question[] {
  const shuffled = shuffleArray(ALPHABETS);
  return shuffled.slice(0, count).map((letter) => {
    const wrong = shuffleArray(ALPHABETS.filter((l) => l !== letter)).slice(0, 3);
    const options = shuffleArray([letter, ...wrong]);
    return { correctLetter: letter, options };
  });
}

export default function QuizAlphabets() {
  const [questions, setQuestions] = useState<Question[]>(() => generateQuestions(5));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const question = questions[currentIdx];
  const isFinished = answers.length === questions.length;

  const score = useMemo(() => answers.filter(Boolean).length, [answers]);

  const handleSelect = (letter: string) => {
    if (selected) return;
    setSelected(letter);
    const correct = letter === question.correctLetter;
    const newAnswers = [...answers, correct];
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx((prev) => prev + 1);
        setSelected(null);
      } else {
        const finalScore = newAnswers.filter(Boolean).length;
        addQuizResult({ score: finalScore, total: questions.length, date: new Date().toISOString(), mode: "alphabets" });
        setShowResult(true);
      }
    }, 1200);
  };

  const restart = () => {
    setQuestions(generateQuestions(5));
    setCurrentIdx(0);
    setSelected(null);
    setAnswers([]);
    setShowResult(false);
    setImgErrors({});
  };

  if (showResult) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <header className="border-b border-gray-800 bg-gray-950/90 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
            <Link to="/learning/quiz" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Quiz</span>
            </Link>
            <h1 className="text-lg font-bold">Results</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-6 max-w-md">
            <Trophy className={`w-20 h-20 mx-auto ${pct >= 80 ? "text-yellow-400" : pct >= 50 ? "text-gray-300" : "text-red-400"}`} />
            <h2 className="text-4xl font-bold">{score}/{questions.length}</h2>
            <p className="text-gray-400">
              {pct >= 80 ? "Excellent! You really know your ASL alphabet!" : pct >= 50 ? "Good job! Keep practicing to improve." : "Keep learning! Practice makes perfect."}
            </p>
            <div className="w-full bg-gray-800 rounded-full h-3">
              <div className={`h-3 rounded-full transition-all duration-1000 ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex gap-3">
              <button onClick={restart} className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold flex items-center justify-center gap-2 transition-all">
                <RotateCcw className="w-4 h-4" /> Try Again
              </button>
              <Link to="/learning/quiz" className="flex-1 py-3 rounded-xl border border-white/10 font-semibold text-center hover:bg-white/5 transition-all">
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
          <Link to="/learning/quiz" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Quiz</span>
          </Link>
          <h1 className="text-lg font-bold">Alphabet Quiz</h1>
          <span className="ml-auto text-sm text-gray-400">{currentIdx + 1}/{questions.length}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIdx) / questions.length) * 100}%` }}
          />
        </div>

        <div className="text-center">
          <p className="text-lg text-gray-300">
            Which image shows the ASL sign for letter <span className="text-2xl font-bold text-emerald-400">"{question.correctLetter}"</span>?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {question.options.map((letter) => {
            const isCorrect = letter === question.correctLetter;
            const isSelected = selected === letter;
            let borderClass = "border-white/10 hover:border-white/30";
            if (selected) {
              if (isCorrect) borderClass = "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30";
              else if (isSelected) borderClass = "border-red-500 bg-red-500/10 ring-2 ring-red-500/30";
              else borderClass = "border-white/5 opacity-50";
            }

            return (
              <button
                key={letter}
                onClick={() => handleSelect(letter)}
                disabled={!!selected}
                className={`rounded-xl border ${borderClass} bg-white/5 overflow-hidden transition-all duration-300`}
              >
                <div className="aspect-square bg-gray-800 flex items-center justify-center overflow-hidden">
                  {!imgErrors[letter] ? (
                    <img
                      src={`${LEARNING_API_BASE}/api/learning/alphabet/image/${letter}`}
                      alt={`ASL sign option`}
                      className="w-full h-full object-cover"
                      onError={() => setImgErrors((prev) => ({ ...prev, [letter]: true }))}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 p-4">
                      <span className="text-6xl font-bold text-gray-700/50">?</span>
                      <p className="text-xs mt-2">Option {question.options.indexOf(letter) + 1}</p>
                    </div>
                  )}
                </div>
                <div className="p-3 text-center">
                  {selected && isCorrect && <span className="text-sm font-medium text-emerald-400">Correct!</span>}
                  {selected && isSelected && !isCorrect && <span className="text-sm font-medium text-red-400">Wrong</span>}
                  {!selected && <span className="text-sm text-gray-400">Select</span>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center gap-2">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i < answers.length
                  ? answers[i] ? "bg-emerald-500" : "bg-red-500"
                  : i === currentIdx ? "bg-white" : "bg-gray-700"
              }`}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
