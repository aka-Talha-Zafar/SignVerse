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

      <main className="relative z-10 flex-1 w-full px-4 sm:px-6 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero — full width */}
          <div
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 md:mb-8 animate-fade-up motion-reduce:animate-none"
            style={{ animationFillMode: "backwards" }}
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary/80 mb-2">Dashboard</p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Welcome back, <span className="text-primary">{displayName}</span>
              </h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">Your learning snapshot and shortcuts</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-gray-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
              Live progress synced
            </div>
          </div>

          {/* Bento: main (stats + actions) | insights rail */}
          <div className="flex flex-col xl:grid xl:grid-cols-12 xl:gap-8 gap-8">
            <div className="xl:col-span-8 space-y-6 md:space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {stats.map((s, i) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:p-5 shadow-sm ring-1 ring-white/[0.02] hover:ring-primary/20 hover:bg-white/[0.07] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 motion-reduce:transform-none motion-reduce:hover:transform-none animate-fade-up motion-reduce:animate-none"
                    style={{
                      animationDelay: `${80 + i * 60}ms`,
                      animationFillMode: "backwards",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                      <s.icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${s.color}`} />
                      <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider text-right leading-tight">
                        {s.label}
                      </span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold tabular-nums">{s.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold tracking-tight">Quick actions</h2>
                  <span className="text-xs text-gray-500 hidden sm:inline">Jump into a tool</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {features.map((f, i) => (
                    <Link
                      key={f.title}
                      to={f.href}
                      className="group relative flex flex-col h-full min-h-[200px] rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm ring-1 ring-white/[0.03] overflow-hidden transition-all duration-300 hover:border-primary/35 hover:bg-white/[0.07] hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 motion-reduce:transform-none motion-reduce:hover:transform-none animate-fade-up motion-reduce:animate-none"
                      style={{
                        animationDelay: `${200 + i * 90}ms`,
                        animationFillMode: "backwards",
                      }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                        aria-hidden
                      />
                      <div
                        className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center border border-white/10 mb-4 group-hover:scale-105 transition-transform duration-300`}
                      >
                        <f.icon className="w-5 h-5 text-white drop-shadow-sm" />
                      </div>
                      <h3 className="relative text-base font-semibold mb-2 group-hover:text-primary transition-colors">
                        {f.title}
                      </h3>
                      <p className="relative text-sm text-gray-400 leading-snug flex-1 mb-4 line-clamp-3">
                        {f.desc}
                      </p>
                      <span className="relative mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                        Open
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <aside className="xl:col-span-4">
              <div
                className="xl:sticky xl:top-20 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 sm:p-6 shadow-lg shadow-black/20 ring-1 ring-white/[0.04] backdrop-blur-sm animate-fade-up motion-reduce:animate-none"
                style={{ animationDelay: "280ms", animationFillMode: "backwards" }}
              >
                <h2 className="text-lg font-semibold tracking-tight">Learning insights</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-relaxed">
                  Tap a tile to continue where you left off — quizzes, letters, words, or sentences.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {insightCards.map((c, i) => (
                    <Link
                      key={c.label}
                      to={c.to}
                      className="group relative flex flex-col rounded-xl border border-white/10 bg-black/30 p-3.5 sm:p-4 transition-all duration-300 hover:border-primary/35 hover:bg-white/[0.06] hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5 motion-reduce:transform-none animate-fade-up motion-reduce:animate-none"
                      style={{
                        animationDelay: `${320 + i * 50}ms`,
                        animationFillMode: "backwards",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <c.icon className={`w-4 h-4 shrink-0 ${c.color}`} />
                        <ArrowRight className="w-3.5 h-3.5 text-gray-600 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-primary" />
                      </div>
                      <p className="text-xl sm:text-2xl font-bold tabular-nums leading-none mb-1">{c.value}</p>
                      <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider leading-tight">
                        {c.label}
                      </p>
                      <p className="mt-2 text-[11px] sm:text-xs text-gray-500 leading-snug line-clamp-2 group-hover:text-gray-400 transition-colors">
                        {c.hint}
                      </p>
                    </Link>
                  ))}
                </div>

                {lastQuiz && (
                  <div className="mt-5 pt-4 border-t border-white/10">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1.5">Latest quiz</p>
                    <p className="text-sm text-gray-300">
                      <span className="text-white font-medium">
                        {lastQuizModeLabel} · {lastQuiz.score}/{lastQuiz.total}
                      </span>
                      <span className="text-gray-500">
                        {" "}
                        ·{" "}
                        {new Date(lastQuiz.date).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>

      <div className="relative z-10 mt-auto border-t border-white/5 bg-[#0a0a0a]">
        <FooterSection />
      </div>
    </div>
  );
};

export default Dashboard;
