import { Link, useNavigate } from "react-router-dom";
import {
  Hand, Camera, Type, BookOpen, ArrowRight, TrendingUp,
  Award, Activity, LogOut, User, Star, CheckCircle, BookText, MessagesSquare,
} from "lucide-react";
import { useScrollAnimate } from "@/hooks/useScrollAnimate";
import {
  getDailyStreak,
  getOverallAccuracy,
  getQuizzesCompletedCount,
  getSignsLearnedCount,
} from "@/lib/learningProgress";
import { ALPHABETS, getAllWords, SENTENCE_CATEGORIES } from "@/lib/learningData";
import { useAuth } from "@/contexts/AuthContext";
import { useLearningProgress } from "@/contexts/LearningProgressContext";
import FooterSection from "@/components/landing/FooterSection";

const features = [
  {
    title: "Sign to Text",
    desc: "Translate ASL signs to text using your webcam in real-time",
    icon: Camera,
    href: "/sign-to-text",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Text to Sign",
    desc: "Convert written text into animated ASL sign demonstrations",
    icon: Type,
    href: "/text-to-sign",
    gradient: "from-primary/20 to-cyan-500/20",
  },
  {
    title: "Learning Module",
    desc: "Interactive lessons to learn and practice ASL signs",
    icon: BookOpen,
    href: "/learning",
    gradient: "from-green-500/20 to-emerald-500/20",
  },
];

const Dashboard = () => {
  useScrollAnimate();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { progress } = useLearningProgress();

  const displayName =
    user?.displayName?.trim() ||
    (user?.email ? user.email.split("@")[0] : null) ||
    "Learner";

  const accuracy = getOverallAccuracy(progress);
  const signsLearned = getSignsLearnedCount(progress);
  const streak = getDailyStreak(progress);
  const quizzesDone = getQuizzesCompletedCount(progress);
  const alphabetDone = progress.completedAlphabets.length;
  const wordsDone = progress.completedWords.length;
  const sentencesDone = progress.completedSentences.length;
  const wordsTotal = getAllWords().length;
  const sentencesTotal = SENTENCE_CATEGORIES.reduce((n, c) => n + c.sentences.length, 0);
  const lastQuiz = progress.quizResults.length
    ? progress.quizResults[progress.quizResults.length - 1]
    : null;
  const lastQuizModeLabel =
    lastQuiz?.mode === "alphabets" ? "Alphabet" : lastQuiz?.mode === "words" ? "Words" : "Sentences";

  const stats = [
    { label: "Signs Learned", value: String(signsLearned), icon: Award, color: "text-green-400" },
    { label: "Stars", value: String(progress.starsEarned), icon: Star, color: "text-yellow-400" },
    {
      label: "Accuracy Rate",
      value: accuracy > 0 ? `${Math.round(accuracy * 100)}%` : "—",
      icon: TrendingUp,
      color: "text-amber-400",
    },
    { label: "Daily Streak", value: String(streak), icon: Activity, color: "text-sky-400" },
  ];

  const insightCards = [
    {
      label: "Quizzes completed",
      value: String(quizzesDone),
      hint: "Finished alphabet, word, or sentence quiz runs",
      icon: CheckCircle,
      color: "text-green-400",
      to: "/learning/quiz",
    },
    {
      label: "Alphabets",
      value: `${alphabetDone}/${ALPHABETS.length}`,
      hint: "Total number of alphabets learned (Easy Mode)",
      icon: BookOpen,
      color: "text-emerald-400",
      to: "/learning/learn/easy",
    },
    {
      label: "Words",
      value: `${wordsDone}/${wordsTotal}`,
      hint: "Total number of words learned (Medium Mode)",
      icon: BookText,
      color: "text-amber-400",
      to: "/learning/learn/medium",
    },
    {
      label: "Sentences",
      value: `${sentencesDone}/${sentencesTotal}`,
      hint: "Total number of sentences learned (Hard Mode)",
      icon: MessagesSquare,
      color: "text-orange-400",
      to: "/learning/learn/hard",
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden flex flex-col">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Hand className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Sign<span className="text-primary">Verse</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 max-w-[160px] truncate hidden sm:inline" title={user?.email ?? ""}>
              {user?.email}
            </span>
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-10 flex-1 w-full">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold">
            Welcome back, <span className="text-primary">{displayName}</span>
          </h1>
          <p className="text-gray-400 mt-1">Here's your progress overview</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <span className="text-xs text-gray-400 uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-5">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-5 max-w-2xl">
            {features.map((f) => (
              <Link
                key={f.title}
                to={f.href}
                className="group rounded-xl border border-white/10 bg-white/5 p-6 hover:border-primary/50 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-400 mb-4">{f.desc}</p>
                <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">
                  Open <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-1">Learning insights</h2>
          <p className="text-sm text-gray-500 mb-5">
            Snapshot from your previous learning sessions — tap a card to jump to where you can improve it.
          </p>
          <div className="grid grid-cols-1 gap-4 max-w-2xl">
            {insightCards.map((c) => (
              <Link
                key={c.label}
                to={c.to}
                className="rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 hover:border-primary/30 transition-all group text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <c.icon className={`w-5 h-5 ${c.color}`} />
                  <span className="text-xs text-gray-400 uppercase tracking-wider text-right max-w-[55%] leading-tight">
                    {c.label}
                  </span>
                </div>
                <p className="text-2xl font-bold mb-2">{c.value}</p>
                <p className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
                  {c.hint}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Go <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
          {lastQuiz && (
            <p className="text-sm text-gray-500 mt-5 max-w-2xl">
              Latest quiz:{" "}
              <span className="text-gray-300">
                {lastQuizModeLabel} · {lastQuiz.score}/{lastQuiz.total}
              </span>
              {" — "}
              {new Date(lastQuiz.date).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
      </main>

      <div className="relative z-10 mt-auto border-t border-white/5 bg-[#0a0a0a]">
        <FooterSection />
      </div>
    </div>
  );
};

export default Dashboard;
