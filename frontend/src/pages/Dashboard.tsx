import { Link } from "react-router-dom";
import {
  Hand, Camera, Type, BookOpen, ArrowRight, TrendingUp,
  Award, Activity, LogOut, Settings, User, Star,
} from "lucide-react";
import { useScrollAnimate } from "@/hooks/useScrollAnimate";
import {
  getProgress,
  getOverallAccuracy,
  getSignsLearnedCount,
  getDailyStreak,
} from "@/lib/learningProgress";

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
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  {
    title: "Learning Module",
    desc: "Interactive lessons to learn and practice ASL signs",
    icon: BookOpen,
    href: "/learning",
    gradient: "from-green-500/20 to-emerald-500/20",
  },
];

const recentActivity = [
  { action: "Completed Lesson: Greetings", time: "2 hours ago" },
  { action: "Translated 15 signs accurately", time: "5 hours ago" },
  { action: "Achieved 7-day streak!", time: "1 day ago" },
  { action: "Unlocked Advanced Module", time: "2 days ago" },
];

const Dashboard = () => {
  useScrollAnimate();
  const progress = getProgress();
  const accuracy = getOverallAccuracy();
  const signsLearned = getSignsLearnedCount();
  const streak = getDailyStreak();

  const stats = [
    { label: "Signs Learned", value: String(signsLearned), icon: Award, color: "text-green-400" },
    { label: "Stars", value: String(progress.starsEarned), icon: Star, color: "text-yellow-400" },
    {
      label: "Accuracy Rate",
      value: accuracy > 0 ? `${Math.round(accuracy * 100)}%` : "—",
      icon: TrendingUp,
      color: "text-amber-400",
    },
    { label: "Daily Streak", value: String(streak), icon: Activity, color: "text-purple-400" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Hand className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Sign<span className="text-primary">Verse</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <button className="text-gray-400 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <Link to="/login" className="text-gray-400 hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Welcome */}
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold">
            Welcome back, <span className="text-primary">Learner</span>
          </h1>
          <p className="text-gray-400 mt-1">Here's your progress overview</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
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

        {/* Feature Cards */}
        <div>
          <h2 className="text-xl font-semibold mb-5">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-5">
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

        {/* Recent Activity */}
        <div>
          <h2 className="text-xl font-semibold mb-5">Recent Activity</h2>
          <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5">
            {recentActivity.map((a, i) => (
              <div
                key={i}
                className="px-5 py-4 flex items-center justify-between hover:bg-white/5"
              >
                <span className="text-sm">{a.action}</span>
                <span className="text-xs text-gray-500">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;