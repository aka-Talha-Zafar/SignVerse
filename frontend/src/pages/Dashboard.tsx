import { Link, useNavigate } from "react-router-dom";
import {
  Hand, Camera, Type, BookOpen, ArrowRight, TrendingUp,
  Award, Activity, LogOut, User, Star, CheckCircle, BookText, MessagesSquare,
  Sparkles, Home,
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
      iconBg: "bg-green-500/15 border-green-500/25",
      strip: "border-l-4 border-l-green-500/70",
      to: "/learning/quiz",
    },
    {
      label: "Alphabets",
      value: `${alphabetDone}/${ALPHABETS.length}`,
      hint: "Total number of alphabets learned (Easy Mode)",
      icon: BookOpen,
      color: "text-emerald-400",
      iconBg: "bg-emerald-500/15 border-emerald-500/25",
      strip: "border-l-4 border-l-emerald-500/70",
      to: "/learning/learn/easy",
    },
    {
      label: "Words",
      value: `${wordsDone}/${wordsTotal}`,
      hint: "Total number of words learned (Medium Mode)",
      icon: BookText,
      color: "text-amber-400",
      iconBg: "bg-amber-500/15 border-amber-500/25",
      strip: "border-l-4 border-l-amber-500/70",
      to: "/learning/learn/medium",
    },
    {
      label: "Sentences",
      value: `${sentencesDone}/${sentencesTotal}`,
      hint: "Total number of sentences learned (Hard Mode)",
      icon: MessagesSquare,
      color: "text-orange-400",
      iconBg: "bg-orange-500/15 border-orange-500/25",
      strip: "border-l-4 border-l-orange-500/70",
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
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Hand className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Sign<span className="text-primary">Verse</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/welcome"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 sm:px-3 text-sm text-gray-300 hover:text-white hover:border-primary/35 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label="Marketing home"
            >
              <Home className="h-4 w-4 shrink-0 text-primary" />
              <span className="hidden sm:inline">Home</span>
            </Link>
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
            <div className="xl:col-span-7 space-y-6 md:space-y-8">
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
                      <p className="relative text-sm text-gray-400 leading-relaxed flex-1 mb-4">
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

            <aside className="xl:col-span-5">
              <div
                className="relative xl:sticky xl:top-20 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-[#0d1117]/90 to-black/60 p-5 sm:p-6 shadow-xl shadow-black/40 ring-1 ring-primary/10 backdrop-blur-md animate-fade-up motion-reduce:animate-none overflow-hidden"
                style={{ animationDelay: "280ms", animationFillMode: "backwards" }}
              >
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" aria-hidden />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="h-px flex-1 max-w-12 bg-gradient-to-r from-primary/60 to-transparent rounded-full" />
                    <h2 className="text-lg font-semibold tracking-tight">Learning insights</h2>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mt-2">
                    Continue quizzes, letters, words, or sentences — each row shows the full summary.
                  </p>

                  <ul className="mt-5 space-y-3">
                    {insightCards.map((c, i) => (
                      <li key={c.label}>
                        <Link
                          to={c.to}
                          className={`group flex gap-3 sm:gap-4 rounded-xl border border-white/10 bg-black/25 px-3 py-3.5 sm:gap-4 sm:px-4 sm:py-4 transition-all duration-300 hover:border-primary/40 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-primary/5 motion-reduce:transform-none ${c.strip} animate-fade-up motion-reduce:animate-none`}
                          style={{
                            animationDelay: `${320 + i * 55}ms`,
                            animationFillMode: "backwards",
                          }}
                        >
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${c.iconBg}`}
                          >
                            <c.icon className={`h-5 w-5 ${c.color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                {c.label}
                              </p>
                              <p className="text-xl font-bold tabular-nums tracking-tight text-white sm:text-2xl">
                                {c.value}
                              </p>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-gray-400 break-words group-hover:text-gray-300 transition-colors">
                              {c.hint}
                            </p>
                          </div>
                          <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-gray-600 transition-all group-hover:translate-x-0.5 group-hover:text-primary sm:mt-0 sm:self-center" />
                        </Link>
                      </li>
                    ))}
                  </ul>

                  {lastQuiz && (
                    <div className="relative mt-5 rounded-xl border border-white/10 bg-primary/5 px-4 py-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/90 mb-1">
                        Latest quiz
                      </p>
                      <p className="text-sm text-gray-200">
                        <span className="font-semibold text-white">
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
              </div>
            </aside>
          </div>

          <section
            className="mt-10 md:mt-14 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-6 sm:p-8 relative overflow-hidden"
            aria-labelledby="dash-about-heading"
          >
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" aria-hidden />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary shrink-0" aria-hidden />
                <h2 id="dash-about-heading" className="text-lg font-semibold tracking-tight">
                  About SignVerse
                </h2>
              </div>
              <p className="text-sm text-gray-400 max-w-3xl leading-relaxed">
                A bidirectional ASL translation and learning platform — real-time recognition, animated signing, and
                structured lessons so deaf and hearing communities can connect more easily.
              </p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-3 sm:gap-4">
                {[
                  {
                    title: "Sign ↔ text",
                    body: "Camera capture with live translation and optional speech output.",
                  },
                  {
                    title: "Learn & quiz",
                    body: "Alphabets, words, and sentences with progress tracked on this dashboard.",
                  },
                  {
                    title: "Built for access",
                    body: "Vision, NLP, and animation orchestrated behind a focused learner experience.",
                  },
                ].map((item) => (
                  <li
                    key={item.title}
                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left"
                  >
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-gray-500 leading-relaxed">{item.body}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link
                  to="/learn-more"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Learn more
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <div className="relative z-10 mt-auto border-t border-white/5 bg-[#0a0a0a]">
        <FooterSection />
      </div>
    </div>
  );
};

export default Dashboard;
