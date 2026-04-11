import { Link } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import ProgressHeader from "./ProgressHeader";

const MODES = [
  {
    id: "easy",
    label: "Easy",
    desc: "Learn the ASL Alphabet — one letter at a time with reference images.",
    color: "emerald",
    href: "/learning/learn/easy",
    stars: 1,
    bg: "from-emerald-500/10 to-green-500/10",
    border: "hover:border-emerald-500/50",
    text: "text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  },
  {
    id: "medium",
    label: "Medium",
    desc: "Learn 250 everyday words organized by category — watch the avatar perform each sign.",
    color: "amber",
    href: "/learning/learn/medium",
    stars: 2,
    bg: "from-amber-500/10 to-orange-500/10",
    border: "hover:border-amber-500/50",
    text: "text-amber-400",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  },
  {
    id: "hard",
    label: "Hard",
    desc: "Learn full sentences built from the 250-word vocabulary — avatar demonstrates multi-word signing.",
    color: "red",
    href: "/learning/learn/hard",
    stars: 3,
    bg: "from-red-500/10 to-rose-500/10",
    border: "hover:border-red-500/50",
    text: "text-red-400",
    badge: "bg-red-500/15 text-red-300 border-red-500/20",
  },
];

export default function LearningLearn() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <ProgressHeader title="Learn Signs" backTo="/learning" backLabel="Learning" />

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Choose Your Difficulty</h2>
          <p className="text-gray-400 text-sm">Progress from letters to full sentences</p>
        </div>

        <div className="grid gap-5 max-w-2xl mx-auto">
          {MODES.map((m) => (
            <Link
              key={m.id}
              to={m.href}
              className={`group relative rounded-2xl border border-white/10 bg-gradient-to-r ${m.bg} ${m.border} p-6 transition-all duration-300 hover:scale-[1.01]`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xl font-bold ${m.text}`}>{m.label}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= m.stars ? `${m.text} fill-current` : "text-gray-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{m.desc}</p>
                </div>
                <ArrowRight className={`w-5 h-5 ${m.text} opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all mt-1`} />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
