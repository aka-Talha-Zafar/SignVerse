import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, BookOpen, Settings, Search, Star,
  CheckCircle, Lock, Play, Trophy, Target, Clock, TrendingUp,
  Camera, CameraOff, Loader2,
} from "lucide-react";
import { useScrollAnimate } from "@/hooks/useScrollAnimate";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:7860";
const PREDICT_INTERVAL_MS = 800;   // predict every 800ms

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

interface PredictionResult {
  letter: string;
  confidence: number;
  top3: { letter: string; confidence: number }[];
}

const Learning = () => {
  useScrollAnimate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery]       = useState("");
  const [cameraOn, setCameraOn]             = useState(false);
  const [prediction, setPrediction]         = useState<PredictionResult | null>(null);
  const [isPredicting, setIsPredicting]     = useState(false);
  const [cameraError, setCameraError]       = useState("");
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);

  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const timerRef   = useRef<NodeJS.Timeout | null>(null);

  const filteredLessons = lessons.filter((l) => {
    const matchCat    = activeCategory === "All" || l.category === activeCategory;
    const matchSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const completedCount = lessons.filter((l) => l.completed).length;
  const totalStars     = lessons.reduce((acc, l) => acc + l.stars, 0);

  // ── Capture + predict ────────────────────────────────────
  const predictFrame = useCallback(async () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || isPredicting) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width  = 224;
    canvas.height = 224;
    ctx.drawImage(video, 0, 0, 224, 224);

    const frame = canvas.toDataURL("image/jpeg", 0.8);
    setIsPredicting(true);

    try {
      const res = await fetch(`${API_BASE}/api/learning/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frame }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPrediction(data);
    } catch {
      // Silent fail — just skip this frame
    } finally {
      setIsPredicting(false);
    }
  }, [isPredicting]);

  const startCamera = async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      streamRef.current = stream;
      timerRef.current  = setInterval(predictFrame, PREDICT_INTERVAL_MS);
      setCameraOn(true);
    } catch {
      setCameraError("Cannot access camera. Please allow camera permission.");
    }
  };

  const stopCamera = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setPrediction(null);
    setActiveLessonId(null);
  };

  useEffect(() => () => stopCamera(), []);

  // Re-register timer when predictFrame changes
  useEffect(() => {
    if (cameraOn && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(predictFrame, PREDICT_INTERVAL_MS);
    }
  }, [predictFrame]);

  const handleStartLesson = (lessonId: number) => {
    setActiveLessonId(lessonId);
    if (!cameraOn) startCamera();
  };

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

        {/* ASL Camera Practice Panel — shown when a lesson is active */}
        {activeLessonId && (
          <div className="rounded-2xl border border-primary/30 bg-card/80 backdrop-blur-sm p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Live Practice — {lessons.find(l=>l.id===activeLessonId)?.title}
              </h2>
              <button
                onClick={stopCamera}
                className="px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive text-sm hover:bg-destructive/10 transition-all"
              >
                <CameraOff className="w-4 h-4 inline mr-1" /> Stop
              </button>
            </div>

            {cameraError && (
              <div className="mb-3 p-2 rounded bg-destructive/10 text-destructive text-sm">{cameraError}</div>
            )}

            <div className="grid sm:grid-cols-2 gap-6 items-start">
              {/* Video feed */}
              <div className="rounded-xl overflow-hidden bg-secondary/20 aspect-video relative">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <canvas ref={canvasRef} className="hidden" />
                {isPredicting && (
                  <div className="absolute top-2 right-2">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/50 px-2 py-1 rounded">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-white font-mono">LIVE</span>
                </div>
              </div>

              {/* Prediction result */}
              <div className="space-y-4">
                {prediction ? (
                  <>
                    <div className="text-center">
                      <div className="text-7xl font-bold text-primary mb-2">
                        {prediction.letter.toUpperCase()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Confidence: <span className="text-foreground font-medium">
                          {Math.round(prediction.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Confidence bar */}
                    <div className="space-y-2">
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300 rounded-full"
                          style={{ width: `${prediction.confidence * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Top 3 */}
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Top 3 predictions:</p>
                      {prediction.top3.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${i===0 ? "text-primary" : "text-foreground"}`}>
                            {item.letter.toUpperCase()}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${i===0 ? "bg-primary" : "bg-muted-foreground/40"}`}
                                style={{ width: `${item.confidence*100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {Math.round(item.confidence*100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Show your hand sign to the camera...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
          {[
            { label: "Completed", value: `${completedCount}/${lessons.length}`, icon: CheckCircle, color: "text-green-400" },
            { label: "Stars Earned", value: `${totalStars}/${lessons.length*3}`, icon: Star, color: "text-yellow-400" },
            { label: "Total Practice", value: "4.5 hrs", icon: Clock, color: "text-primary" },
            { label: "Accuracy", value: prediction ? `${Math.round(prediction.confidence*100)}%` : "89%", icon: Target, color: "text-primary" },
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
                lesson.locked ? "border-border/50 opacity-60"
                : activeLessonId === lesson.id ? "border-primary/50 ring-1 ring-primary/20"
                : "border-border hover:scale-[1.02]"
              }`}
            >
              <div className="relative p-5 pb-3">
                {lesson.locked && <div className="absolute top-3 right-3"><Lock className="w-4 h-4 text-muted-foreground" /></div>}
                {lesson.completed && <div className="absolute top-3 right-3"><CheckCircle className="w-4 h-4 text-green-400" /></div>}
                <span className="text-xs text-primary/80 font-medium">{lesson.category}</span>
                <h3 className="text-base font-semibold text-foreground mt-1 group-hover:text-primary transition-colors">
                  {lesson.title}
                </h3>
              </div>
              <div className="px-5 pb-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Play className="w-3 h-3" /> {lesson.signs} signs</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {lesson.duration}</span>
              </div>
              <div className="px-5 pb-2 flex gap-1">
                {[1,2,3].map((s) => (
                  <Star key={s} className={`w-4 h-4 transition-all ${s<=lesson.stars ? "text-yellow-400 fill-yellow-400" : "text-border"}`} />
                ))}
              </div>
              <div className="p-4 pt-2 border-t border-border mt-2">
                <button
                  disabled={!!lesson.locked}
                  onClick={() => !lesson.locked && handleStartLesson(lesson.id)}
                  className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                    lesson.locked
                      ? "bg-secondary/30 text-muted-foreground cursor-not-allowed"
                      : activeLessonId === lesson.id
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : lesson.completed
                      ? "bg-secondary/50 text-foreground hover:bg-secondary/70"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
                  }`}
                >
                  {lesson.locked ? (
                    <><Lock className="w-3 h-3" /> Locked</>
                  ) : activeLessonId === lesson.id ? (
                    <><Camera className="w-3 h-3" /> Practicing...</>
                  ) : lesson.completed ? (
                    <><TrendingUp className="w-3 h-3" /> Practice Again</>
                  ) : (
                    <><Play className="w-3 h-3" /> Start Lesson</>
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