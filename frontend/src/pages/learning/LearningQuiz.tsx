import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ProgressHeader from "./ProgressHeader";

const QUIZ_MODES = [
  {
    id: "alphabets",
    label: "Alphabets",
    desc: "Identify the correct ASL letter from 4 image options. 5 questions per quiz.",
    href: "/learning/quiz/alphabets",
    emoji: "🔤",
    bg: "from-emerald-500/10 to-teal-500/10",
    border: "hover:border-emerald-500/50",
    text: "text-emerald-400",
  },
  {
    id: "words",
    label: "Words",
    desc: "Perform the shown word in ASL using your camera. 5 words per quiz.",
    href: "/learning/quiz/words",
    emoji: "✋",
    bg: "from-amber-500/10 to-orange-500/10",
    border: "hover:border-amber-500/50",
    text: "text-amber-400",
  },
  {
    id: "sentences",
    label: "Sentences",
    desc: "Sign a multi-word sentence clearly. 3 sentences per quiz.",
    href: "/learning/quiz/sentences",
    emoji: "💬",
    bg: "from-red-500/10 to-rose-500/10",
    border: "hover:border-red-500/50",
    text: "text-red-400",
  },
];

export default function LearningQuiz() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <ProgressHeader title="Quiz" backTo="/learning" backLabel="Learning" />

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Test Your Knowledge</h2>
          <p className="text-gray-400 text-sm">Choose a quiz type to begin</p>
        </div>

        <div className="grid gap-5">
          {QUIZ_MODES.map((m) => (
            <Link
              key={m.id}
              to={m.href}
              className={`group rounded-2xl border border-white/10 bg-gradient-to-r ${m.bg} ${m.border} p-6 transition-all duration-300 hover:scale-[1.01]`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{m.emoji}</span>
                <div className="flex-1">
                  <p className={`text-xl font-bold ${m.text}`}>{m.label}</p>
                  <p className="text-gray-400 text-sm mt-1">{m.desc}</p>
                </div>
                <ArrowRight className={`w-5 h-5 ${m.text} opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all`} />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
