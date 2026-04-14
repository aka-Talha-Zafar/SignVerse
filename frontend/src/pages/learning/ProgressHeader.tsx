import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, Star, Award, Target } from "lucide-react";
import {
  getProgress,
  getOverallAccuracy,
  getQuizzesCompletedCount,
  getSignsLearnedCount,
} from "@/lib/learningProgress";

interface Props {
  title: string;
  backTo: string;
  backLabel?: string;
}

export default function ProgressHeader({ title, backTo, backLabel }: Props) {
  const progress = getProgress();
  const accuracy = getOverallAccuracy();
  const quizzesDone = getQuizzesCompletedCount();
  const signsLearned = getSignsLearnedCount();

  const stats = [
    { label: "Completed quiz", value: String(quizzesDone), icon: CheckCircle, color: "text-green-400" },
    { label: "Stars", value: String(progress.starsEarned), icon: Star, color: "text-yellow-400" },
    { label: "Signs learned", value: String(signsLearned), icon: Award, color: "text-emerald-400" },
    {
      label: "Accuracy",
      value: accuracy > 0 ? `${Math.round(accuracy * 100)}%` : "—",
      icon: Target,
      color: "text-purple-400",
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link to={backTo} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            {backLabel && <span className="text-sm hidden sm:inline">{backLabel}</span>}
          </Link>
          <h1 className="text-lg font-bold text-white">{title}</h1>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
              <s.icon className={`w-4 h-4 ${s.color} shrink-0`} />
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-sm font-bold text-white">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
