import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Type, Play, Pause, RotateCcw,
  Settings, SkipForward, SkipBack, User as UserIcon, Loader2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:7860";

interface KeypointFrame {
  timestamp: number;
  pose: number[][];   // 33 × [x,y,z]
}

// Map landmark index to body part connections
const CONNECTIONS = [
  [11,12],[11,13],[13,15],[12,14],[14,16],  // arms
  [11,23],[12,24],[23,24],                   // torso
  [23,25],[25,27],[24,26],[26,28],           // legs
  [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8], // face
];

const TextToSign = () => {
  const [inputText, setInputText]   = useState("");
  const [playing, setPlaying]       = useState(false);
  const [speed, setSpeed]           = useState(1);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [keyframes, setKeyframes]   = useState<KeypointFrame[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [progress, setProgress]     = useState(0);

  const animFrameRef = useRef<number | null>(null);
  const playStartRef = useRef<number>(0);
  const totalDurRef  = useRef<number>(0);
  const canvasRef    = useRef<HTMLCanvasElement>(null);

  // ── Fetch keypoints from API ─────────────────────────────
  const fetchKeypoints = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError("");
    setKeyframes([]);
    setCurrentFrame(0);
    setProgress(0);

    try {
      const res = await fetch(`${API_BASE}/api/text-to-sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText.trim(), speed }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setKeyframes(data.keyframes || []);
      totalDurRef.current = data.duration_seconds || 0;
    } catch (e: any) {
      setError("Failed to get signing animation. Check if backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // ── Draw one frame on canvas ─────────────────────────────
  const drawFrame = useCallback((frame: KeypointFrame | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width; const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (!frame) {
      // Draw idle skeleton
      drawIdle(ctx, W, H);
      return;
    }

    const pts = frame.pose;   // 33 × [x,y,z]

    // Draw connections
    ctx.strokeStyle = "rgba(99,102,241,0.6)";
    ctx.lineWidth   = 2.5;
    for (const [a, b] of CONNECTIONS) {
      if (!pts[a] || !pts[b]) continue;
      ctx.beginPath();
      ctx.moveTo(pts[a][0]*W, pts[a][1]*H);
      ctx.lineTo(pts[b][0]*W, pts[b][1]*H);
      ctx.stroke();
    }

    // Draw joints
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      ctx.beginPath();
      ctx.arc(x*W, y*H, i < 11 ? 3 : 5, 0, Math.PI*2);
      ctx.fillStyle = i < 11 ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.8)";
      ctx.fill();
    }
  }, []);

  const drawIdle = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    // Simple static stick figure
    ctx.strokeStyle = "rgba(99,102,241,0.4)";
    ctx.lineWidth   = 2.5;
    const cx = W/2; const cy = H/2 - 30;
    // Head
    ctx.beginPath(); ctx.arc(cx, cy-40, 20, 0, Math.PI*2);
    ctx.stroke();
    // Body
    ctx.beginPath(); ctx.moveTo(cx, cy-20); ctx.lineTo(cx, cy+50); ctx.stroke();
    // Arms
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx-40, cy+30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx+40, cy+30); ctx.stroke();
    // Legs
    ctx.beginPath(); ctx.moveTo(cx, cy+50); ctx.lineTo(cx-30, cy+100); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy+50); ctx.lineTo(cx+30, cy+100); ctx.stroke();

    ctx.fillStyle  = "rgba(99,102,241,0.3)";
    ctx.font       = "12px monospace";
    ctx.textAlign  = "center";
    ctx.fillText("2D Skeleton Avatar", cx, cy+120);
  };

  // ── Animation loop ───────────────────────────────────────
  const startAnimation = useCallback(() => {
    if (keyframes.length === 0) return;
    playStartRef.current = performance.now();
    setPlaying(true);

    const loop = (now: number) => {
      const elapsed = (now - playStartRef.current) / 1000 * speed;
      const dur = totalDurRef.current || 1;
      const pct = Math.min(elapsed / dur, 1);
      setProgress(pct * 100);

      const fi = Math.min(Math.floor(pct * keyframes.length), keyframes.length - 1);
      setCurrentFrame(fi);
      drawFrame(keyframes[fi]);

      if (pct < 1) {
        animFrameRef.current = requestAnimationFrame(loop);
      } else {
        setPlaying(false);
        setProgress(100);
      }
    };
    animFrameRef.current = requestAnimationFrame(loop);
  }, [keyframes, speed, drawFrame]);

  const stopAnimation = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setPlaying(false);
  };

  const resetAnimation = () => {
    stopAnimation();
    setCurrentFrame(0);
    setProgress(0);
    drawFrame(keyframes[0] || null);
  };

  // Draw idle on mount and when keyframes cleared
  useEffect(() => {
    if (keyframes.length === 0) drawFrame(null);
    else drawFrame(keyframes[0]);
  }, [keyframes]);

  // Cleanup
  useEffect(() => () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); }, []);

  const handlePlay = async () => {
    if (keyframes.length === 0) {
      await fetchKeypoints();
    } else {
      startAnimation();
    }
  };

  // Auto-start animation after fetch
  useEffect(() => {
    if (!loading && keyframes.length > 0) startAnimation();
  }, [loading, keyframes]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass-solid">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Type className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold text-foreground">Text to Sign</h1>
            </div>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-5 animate-fade-up">
            <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6">
              <label className="text-sm font-medium text-foreground mb-3 block">Enter text to translate</label>
              <textarea
                value={inputText}
                onChange={(e) => { setInputText(e.target.value); setKeyframes([]); }}
                placeholder="Type an English sentence here..."
                rows={5}
                className="w-full bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground text-sm rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300"
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-muted-foreground">{inputText.length} characters</span>
                <button
                  onClick={handlePlay}
                  disabled={!inputText.trim() || loading}
                  className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center gap-2 hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {loading ? "Loading..." : "Translate"}
                </button>
              </div>
            </div>

            {/* Quick phrases */}
            <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-5">
              <h3 className="text-sm font-medium text-foreground mb-3">Quick Phrases</h3>
              <div className="flex flex-wrap gap-2">
                {["Hello","Thank you","My name is...","How are you?","Nice to meet you","Please","Sorry","Goodbye"].map((phrase) => (
                  <button
                    key={phrase}
                    onClick={() => { setInputText(phrase); setKeyframes([]); }}
                    className="px-3 py-1.5 rounded-lg border border-border bg-secondary/30 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-300"
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Avatar Canvas */}
          <div className="animate-fade-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
            <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm h-full flex flex-col">
              <div className="relative flex-1 bg-secondary/20 flex items-center justify-center min-h-[350px] p-4">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={360}
                  className="w-full max-w-sm"
                />
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-t-2xl">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <span className="text-sm text-muted-foreground">Generating signing animation...</span>
                    </div>
                  </div>
                )}
                {playing && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                    <span className="text-xs text-primary font-mono animate-pulse bg-card/80 px-3 py-1 rounded-full border border-primary/20">
                      Signing...
                    </span>
                  </div>
                )}
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-card/80 border border-border rounded-lg px-3 py-1.5">
                  <UserIcon className="w-3 h-3 text-primary" />
                  <span className="text-xs text-muted-foreground">2D Skeleton Avatar</span>
                </div>
              </div>

              {/* Progress bar */}
              {keyframes.length > 0 && (
                <div className="px-4 pt-3">
                  <div className="w-full h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-100 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Frame {currentFrame+1}/{keyframes.length}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                </div>
              )}

              {/* Playback controls */}
              <div className="p-4 border-t border-border mt-2">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={resetAnimation}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    onClick={playing ? stopAnimation : handlePlay}
                    disabled={!inputText.trim() || loading}
                    className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" />
                    : playing ? <Pause className="w-4 h-4" />
                    : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <button
                    onClick={() => { stopAnimation(); drawFrame(keyframes[keyframes.length-1] || null); }}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                  <button
                    onClick={resetAnimation}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className="text-xs text-muted-foreground">Speed:</span>
                  {[0.5, 1, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-2 py-0.5 rounded text-xs transition-all ${
                        speed === s
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TextToSign;