import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Type, Play, Pause, RotateCcw,
  SkipForward, SkipBack, User as UserIcon, Loader2, AlertCircle,
} from "lucide-react";
import { drawMannequinFrame } from "@/lib/textToSignMannequin";

// Update this to your Hugging Face Space URL
const API_BASE = import.meta.env.VITE_API_URL || "https://your-huggingface-space-url.hf.space";

export default function TextToSign() {
  const [inputText,    setInputText]    = useState("");
  const [frames,       setFrames]       = useState<any[]>([]);
  const [isLoading,    setIsLoading]    = useState(false);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [error,        setError]        = useState("");
  const [fpsRate,      setFpsRate]      = useState(20);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLooping,    setIsLooping]    = useState(true);

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Animation engine state
  const engine = useRef({
    anim: [] as any[],
    fi: 0,
    lastTime: 0,
    accumulator: 0
  });

  // ── Render Loop ─────────────────────────────────────────────────────────
  const renderLoop = useCallback((time: number) => {
    let en = engine.current;
    if (!en.lastTime) en.lastTime = time;
    let dt = time - en.lastTime; en.lastTime = time;

    if (isPlaying && en.anim.length > 0) {
        en.accumulator += dt;
        let frameDuration = 1000 / (fpsRate * playbackSpeed);
        while (en.accumulator >= frameDuration) {
            en.accumulator -= frameDuration; en.fi++;
            if (en.fi >= en.anim.length) {
                if (isLooping) { en.fi = 0; } 
                else { en.fi = en.anim.length - 1; setIsPlaying(false); }
            }
        }
        setCurrentFrame(en.fi);
    }

    if (canvasRef.current) {
      const hasAnim = en.anim.length > 0;
      drawMannequinFrame(hasAnim ? en.anim[en.fi] : null, canvasRef.current, {
        idlePlaceholder: false,
      });
    }
    requestRef.current = requestAnimationFrame(renderLoop);
  }, [isPlaying, isLooping, playbackSpeed, fpsRate]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(renderLoop);
    return () => { if(requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [renderLoop]);

  // ── Translate text (API Call to Hugging Face) ──────────────────────────
  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setError("");
    setIsLoading(true);
    setIsPlaying(false);
    setFrames([]);
    engine.current.anim = [];
    engine.current.fi = 0;
    engine.current.accumulator = 0;
    engine.current.lastTime = 0;

    try {
      const res = await fetch(`${API_BASE}/api/text-to-sign`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: inputText.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      if (!data.frames?.length) throw new Error("No animation data returned");

      setFrames(data.frames);
      setFpsRate(data.fps || 20);
      
      engine.current.anim = data.frames;
      engine.current.fi = 0;
      setCurrentFrame(0);
      setIsPlaying(true);

    } catch (e: any) {
      setError(e.message);
      engine.current.anim = [];
      setFrames([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay  = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => { engine.current.fi = 0; setCurrentFrame(0); setIsPlaying(true); };

  const handlePrev = () => {
    setIsPlaying(false);
    if(engine.current.anim.length > 0) {
      engine.current.fi = Math.max(0, engine.current.fi - 1);
      setCurrentFrame(engine.current.fi);
    }
  };
  const handleNext = () => {
    setIsPlaying(false);
    if(engine.current.anim.length > 0) {
      engine.current.fi = Math.min(engine.current.anim.length - 1, engine.current.fi + 1);
      setCurrentFrame(engine.current.fi);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative">
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <header className="sticky top-0 z-50 relative border-b border-white/5 bg-black/50 backdrop-blur-xl px-6 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <UserIcon className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Text to Sign</h1>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto p-6 grid lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Enter English text
            </h2>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleTranslate(); }}
              placeholder="Type a sentence or phrase to translate into ASL…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                         text-white placeholder-gray-500 resize-none focus:outline-none
                         focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors"
              rows={4}
            />
          </div>

          <button
            onClick={handleTranslate}
            disabled={isLoading || !inputText.trim()}
            className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-50
                       disabled:cursor-not-allowed rounded-xl font-semibold flex items-center
                       justify-center gap-2 transition-all text-primary-foreground"
          >
            {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" />Translating…</> : <><Type className="w-5 h-5" />Translate to Sign</>}
          </button>

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Avatar panel */}
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl">
            <canvas ref={canvasRef} width={600} height={600} className="w-full aspect-square block" style={{ background: "hsl(220 20% 6%)" }} />
            {frames.length === 0 && !isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[hsl(220_20%_6%)]/95 px-6 text-center pointer-events-none">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <Type className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm font-medium text-gray-300">No animation yet</p>
                <p className="text-xs text-gray-500 max-w-[260px] leading-relaxed">
                  Type your message, then press <span className="text-gray-400">Translate to Sign</span>. The signer appears here and plays automatically.
                </p>
              </div>
            )}
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-gray-300">Generating signs…</p>
              </div>
            )}
          </div>

          {/* Playback controls */}
          {frames.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: frames.length ? `${(currentFrame / (frames.length - 1)) * 100}%` : "0%" }} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Frame {currentFrame + 1}</span>
                <span>{frames.length} total</span>
              </div>

              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button onClick={handlePrev} className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-400 hover:text-white transition-all border border-white/10"><SkipBack className="w-5 h-5" /></button>
                <button onClick={handleReset} className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-400 hover:text-white transition-all border border-white/10"><RotateCcw className="w-5 h-5" /></button>
                <button onClick={isPlaying ? handlePause : handlePlay} className="px-6 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 transition-all">
                  {isPlaying ? <><Pause className="w-5 h-5" />Pause</> : <><Play className="w-5 h-5" />Play</>}
                </button>
                <button onClick={handleNext} className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-400 hover:text-white transition-all border border-white/10"><SkipForward className="w-5 h-5" /></button>
                
                <button onClick={() => setIsLooping(!isLooping)} className={`ml-4 px-4 py-2 text-xs font-bold rounded-xl transition-all border ${isLooping ? 'bg-emerald-600 text-white border-emerald-500/50' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                    🔁 Loop {isLooping ? '' : 'Off'}
                </button>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 ml-2">
                    <label>{playbackSpeed.toFixed(2)}x</label>
                    <input type="range" min="0.25" max="2" step="0.25" value={playbackSpeed} onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))} className="w-20 accent-[hsl(217_91%_60%)]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}