import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, BookOpen, Settings, Search, Star,
  CheckCircle, Lock, Play, Trophy, Target, Clock, TrendingUp,
} from "lucide-react";
import { useScrollAnimate } from "@/hooks/useScrollAnimate";

const categories = ["All", "Basics", "Greetings", "Numbers", "Emotions", "Daily Life"];

const lessons = [
  { id: 1, title: "Alphabet (A-M)", category: "Basics", signs: 13, duration: "15 min", completed: true, stars: 3 },
  { id: 2, title: "Alphabet (N-Z)", category: "Basics", signs: 13, duration: "15 min", completed: true, stars: 2 },
  { id: 3, title: "Common Greetings", category: "Greetings", signs: 8, duration: "10 min", completed: true, stars: 3 },
  { id: 4, title: "Numbers 1-20", category: "Numbers", signs: 20, duration: "20 min", completed: false, stars: 0 },
  { id: 5, title: "Feelings & Emotions", category: "Emotions", signs: 12, duration: "15 min", completed: false, stars: 0 },
  { id: 6, title: "Family Members", category: "Daily Life", signs: 10, duration: "12 min", completed: false, stars: 0, locked: true },
  { id: 7, title: "Food & Drinks", category: "Daily Life", signs: 15, duration: "18 min", completed: false, stars: 0, locked: true },
  { id: 8, title: "Advanced Phrases", category: "Daily Life", signs: 20, duration: "25 min", completed: false, stars: 0, locked: true },
];

const Learning = () => {
  useScrollAnimate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLessons = lessons.filter((l) => {
    const matchCategory = activeCategory === "All" || l.category === activeCategory;
    const matchSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const completedCount = lessons.filter((l) => l.completed).length;
  const totalStars = lessons.reduce((acc, l) => acc + l.stars, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass-solid">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold text-foreground">Learning Module</h1>
            </div>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Progress Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
          {[
            { label: "Completed", value: `${completedCount}/${lessons.length}`, icon: CheckCircle, color: "text-green-400" },
            { label: "Stars Earned", value: `${totalStars}/${lessons.length * 3}`, icon: Star, color: "text-yellow-400" },
            { label: "Total Practice", value: "4.5 hrs", icon: Clock, color: "text-primary" },
            { label: "Accuracy", value: "89%", icon: Target, color: "text-purple-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4 glow-card gradient-border">
              <div className="flex items-center justify-between mb-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lessons..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-300 ${
                  activeCategory === c
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "border border-border text-muted-foreground hover:text-foreground hover:border-primary/20"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Lesson Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
          {filteredLessons.map((lesson) => (
            <div
              key={lesson.id}
              className={`scroll-animate rounded-xl border bg-card/80 backdrop-blur-sm overflow-hidden glow-card gradient-border group transition-all duration-500 ${
                lesson.locked ? "border-border/50 opacity-60" : "border-border hover:scale-[1.02]"
              }`}
            >
              {/* Lesson header */}
              <div className="relative p-5 pb-3">
                {lesson.locked && (
                  <div className="absolute top-3 right-3">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                {lesson.completed && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                )}
                <span className="text-xs text-primary/80 font-medium">{lesson.category}</span>
                <h3 className="text-base font-semibold text-foreground mt-1 group-hover:text-primary transition-colors">
                  {lesson.title}
                </h3>
              </div>

              {/* Info */}
              <div className="px-5 pb-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Play className="w-3 h-3" /> {lesson.signs} signs
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {lesson.duration}
                </span>
              </div>

              {/* Stars */}
              <div className="px-5 pb-2 flex gap-1">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 transition-all ${
                      s <= lesson.stars ? "text-yellow-400 fill-yellow-400" : "text-border"
                    }`}
                  />
                ))}
              </div>

              {/* Action */}
              <div className="p-4 pt-2 border-t border-border mt-2">
                <button
                  disabled={lesson.locked}
                  className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                    lesson.locked
                      ? "bg-secondary/30 text-muted-foreground cursor-not-allowed"
                      : lesson.completed
                      ? "bg-secondary/50 text-foreground hover:bg-secondary/70"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
                  }`}
                >
                  {lesson.locked ? (
                    <>
                      <Lock className="w-3 h-3" /> Locked
                    </>
                  ) : lesson.completed ? (
                    <>
                      <TrendingUp className="w-3 h-3" /> Practice Again
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" /> Start Lesson
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Achievement Banner */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm p-6 flex items-center gap-5 animate-fade-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Trophy className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Keep going! 🎉</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Complete 2 more lessons to unlock the "Daily Life" category and earn the Explorer badge.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Learning;
