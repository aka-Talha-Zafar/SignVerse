import { Link } from "react-router-dom";
import { BookOpen, Brain, ArrowRight, Trophy, Sparkles } from "lucide-react";
import ProgressHeader from "./ProgressHeader";

export default function LearningHub() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <ProgressHeader title="Learning Module" backTo="/dashboard" backLabel="Dashboard" />

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">
            Learn <span className="text-primary">ASL</span> Your Way
          </h2>
          <p className="text-gray-400">Choose how you want to learn sign language today</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Link
            to="/learning/learn"
            className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-8 hover:border-emerald-500/50 transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-5">
              <BookOpen className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2 group-hover:text-emerald-400 transition-colors">
              Learn Signs
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Study ASL at your own pace with three difficulty levels — from alphabets to full sentences.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {["Alphabets", "Words", "Sentences"].map((tag) => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                  {tag}
                </span>
              ))}
            </div>
            <span className="inline-flex items-center gap-1 text-sm text-emerald-400 font-medium">
              Start Learning <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <Sparkles className="absolute top-6 right-6 w-5 h-5 text-emerald-500/30" />
          </Link>

          <Link
            to="/learning/quiz"
            className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-8 hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-5">
              <Brain className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2 group-hover:text-purple-400 transition-colors">
              Take a Quiz
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Test your ASL knowledge with interactive quizzes — alphabet multiple choice, camera checks for words and sentences.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {["MCQ", "Record & Verify", "Score Tracking"].map((tag) => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">
                  {tag}
                </span>
              ))}
            </div>
            <span className="inline-flex items-center gap-1 text-sm text-purple-400 font-medium">
              Start Quiz <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <Trophy className="absolute top-6 right-6 w-5 h-5 text-purple-500/30" />
          </Link>
        </div>
      </main>
    </div>
  );
}
