import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Type, Play, Pause, RotateCcw,
  SkipForward, SkipBack, User as UserIcon, Loader2, AlertCircle,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "https://talhazafar7406-signverse-api.hf.space";

// MediaPipe 33-point skeleton connections
const SKELETON_CONNECTIONS: [number, number][] = [
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15],
  // Right arm
  [12, 14], [14, 16],
  // Left leg
  [23, 25], [25, 27],
  // Right leg
  [24, 26], [26, 28],
  // Face
  [0, 1], [0, 4], [1, 2], [4, 5],
];

const JOINT_COLORS: Record<number, string> = {
  0: "#f472b6",   // nose — pink
  11: "#818cf8",  // left shoulder
  12: "#818cf8",  // right shoulder
  13: "#a78bfa",  // left elbow
  14: "#a78bfa",  // right elbow
  15: "#c4b5fd",  // left wrist
  16: "#c4b5fd",  // right wrist
  23: "#6ee7b7",  // left hip
  24: "#6ee7b7",  // right hip
};

interface Landmark { x: number; y: number; z: number; visibility?: number; }
interface Frame    { landmarks: Landmark[]; timestamp: number; }

export default function TextToSign() {
  const [inputText,    setInputText]    = useState("");
  const [frames,       setFrames]       = useState<Frame[]>([]);
  const [isLoading,    setIsLoading]    = useState(false);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [error,        setError]        = useState("");
  const [fps,          setFps]          = useState(30);
  const [hasResult,    setHasResult]    = useState(false);

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const animRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameIdx   = useRef(0);

  // ── Draw a single skeleton frame ─────────────────────────────────────────
  const drawFrame = useCallback((frameData: Frame, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx || !frameData?.landmarks?.length) return;

    const W = canvas.width;
    const H = canvas.height;

    // Background
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0f0f1a";
    ctx.fillRect(0, 0, W, H);

    // Grid lines for depth
    ctx.strokeStyle = "rgba(139,92,246,0.08)";
    ctx.lineWidth   = 1;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(i * W / 10, 0); ctx.lineTo(i * W / 10, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * H / 10); ctx.lineTo(W, i * H / 10); ctx.stroke();
    }

    const lm = frameData.landmarks;
    const px = (landmark: Landmark) => landmark.x * W;
    const py = (landmark: Landmark) => landmark.y * H;

    // Draw connections
    SKELETON_CONNECTIONS.forEach(([a, b]) => {
      if (!lm[a] || !lm[b]) return;
      const vis = Math.min(lm[a].visibility ?? 1, lm[b].visibility ?? 1);
      if (vis < 0.1) return;

      ctx.beginPath();
      ctx.moveTo(px(lm[a]), py(lm[a]));
      ctx.lineTo(px(lm[b]), py(lm[b]));

      // Color arms differently
      const isRightArm = ([12, 14, 16].includes(a) || [12, 14, 16].includes(b));
      const isLeftArm  = ([11, 13, 15].includes(a) || [11, 13, 15].includes(b));
      if (isRightArm)     ctx.strokeStyle = `rgba(167,139,250,${vis * 0.9})`;
      else if (isLeftArm) ctx.strokeStyle = `rgba(129,140,248,${vis * 0.9})`;
      else                ctx.strokeStyle = `rgba(110,231,183,${vis * 0.7})`;

      ctx.lineWidth   = isRightArm || isLeftArm ? 4 : 3;
      ctx.lineCap     = "round";
      ctx.stroke();
    });

    // Draw joints
    lm.forEach((point, i) => {
      const vis = point.visibility ?? 1;
      if (vis < 0.1) return;

      const x = px(point);
      const y = py(point);
      const r = [0, 11, 12, 23, 24].includes(i) ? 7 : [13, 14, 15, 16].includes(i) ? 6 : 4;

      // Glow
      const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
      const color = JOINT_COLORS[i] || "#ffffff";
      grd.addColorStop(0,   color + "aa");
      grd.addColorStop(1,   color + "00");
      ctx.beginPath(); ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = grd; ctx.fill();

      // Joint dot
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle   = color;
      ctx.shadowColor = color;
      ctx.shadowBlur  = 8;
      ctx.fill();
      ctx.shadowBlur  = 0;
    });

    // Wrist highlight (active signing hands)
    [15, 16].forEach(i => {
      if (!lm[i]) return;
      const x = px(lm[i]), y = py(lm[i]);
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(196,181,253,0.6)";
      ctx.lineWidth   = 2;
      ctx.stroke();
    });
  }, []);

  // ── Animation loop ────────────────────────────────────────────────────────
  const startAnimation = useCallback((frameList: Frame[], fpsRate: number) => {
    if (animRef.current) clearInterval(animRef.current);
    frameIdx.current = 0;
    setCurrentFrame(0);

    animRef.current = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas || frameList.length === 0) return;

      drawFrame(frameList[frameIdx.current], canvas);
      setCurrentFrame(frameIdx.current);
      frameIdx.current = (frameIdx.current + 1) % frameList.length;
    }, 1000 / fpsRate);

    setIsPlaying(true);
  }, [drawFrame]);

  const stopAnimation = useCallback(() => {
    if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }
    setIsPlaying(false);
  }, []);

  useEffect(() => () => stopAnimation(), [stopAnimation]);

  // ── Translate text ────────────────────────────────────────────────────────
  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setError(""); setIsLoading(true); stopAnimation(); setHasResult(false);

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
      setFps(data.fps || 30);
      setHasResult(true);

      // Draw first frame immediately
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas && data.frames[0]) drawFrame(data.frames[0], canvas);
      }, 50);

    } catch (e: any) {
      setError(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay  = () => startAnimation(frames, fps);
  const handlePause = () => stopAnimation();
  const handleReset = () => { stopAnimation(); frameIdx.current = 0; setCurrentFrame(0);
    if (canvasRef.current && frames[0]) drawFrame(frames[0], canvasRef.current); };

  const handlePrev = () => {
    stopAnimation();
    const i = Math.max(0, frameIdx.current - 1);
    frameIdx.current = i; setCurrentFrame(i);
    if (canvasRef.current && frames[i]) drawFrame(frames[i], canvasRef.current);
  };
  const handleNext = () => {
    stopAnimation();
    const i = Math.min(frames.length - 1, frameIdx.current + 1);
    frameIdx.current = i; setCurrentFrame(i);
    if (canvasRef.current && frames[i]) drawFrame(frames[i], canvasRef.current);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <UserIcon className="w-6 h-6 text-indigo-400" />
        <h1 className="text-xl font-bold">Text to Sign</h1>
      </header>

      <div className="max-w-6xl mx-auto p-6 grid lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Enter English text
            </h2>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleTranslate(); }}
              placeholder="Type a sentence or phrase to translate into ASL…"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                         text-white placeholder-gray-500 resize-none focus:outline-none
                         focus:border-indigo-500 transition-colors"
              rows={4}
            />
            <p className="text-xs text-gray-600 mt-1">Ctrl+Enter to translate</p>
          </div>

          <button
            onClick={handleTranslate}
            disabled={isLoading || !inputText.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                       disabled:cursor-not-allowed rounded-xl font-semibold flex items-center
                       justify-center gap-2 transition-all"
          >
            {isLoading
              ? <><Loader2 className="w-5 h-5 animate-spin" />Translating…</>
              : <><Type className="w-5 h-5" />Translate to Sign</>}
          </button>

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3
                            text-red-300 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Example phrases */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Try an example
            </h3>
            <div className="flex flex-wrap gap-2">
              {["Hello", "Thank you", "How are you", "My name is", "I love you", "Please help me"].map(ex => (
                <button
                  key={ex}
                  onClick={() => setInputText(ex)}
                  className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-indigo-900/50
                             border border-gray-700 hover:border-indigo-600 rounded-full
                             text-gray-300 hover:text-indigo-300 transition-all"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-indigo-900/20 border border-indigo-800/40 rounded-xl p-4 text-sm text-indigo-300">
            <p className="font-semibold mb-1">ℹ️ About this module</p>
            <p className="text-indigo-400 text-xs leading-relaxed">
              The avatar demonstrates ASL signing motions using pose landmarks.
              Sign accuracy improves with shorter, common phrases.
            </p>
          </div>
        </div>

        {/* Avatar panel */}
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl overflow-hidden">
            <canvas
              ref={canvasRef}
              width={480}
              height={480}
              className="w-full aspect-square"
              style={{ background: "#0f0f1a" }}
            />
          </div>

          {/* Playback controls */}
          {hasResult && (
            <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
              {/* Progress bar */}
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all"
                  style={{ width: frames.length ? `${(currentFrame / (frames.length - 1)) * 100}%` : "0%" }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Frame {currentFrame + 1}</span>
                <span>{frames.length} total</span>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-center gap-3">
                <button onClick={handlePrev}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all">
                  <SkipBack className="w-5 h-5" />
                </button>
                <button onClick={handleReset}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all">
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={isPlaying ? handlePause : handlePlay}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                             flex items-center gap-2 transition-all"
                >
                  {isPlaying
                    ? <><Pause className="w-5 h-5" />Pause</>
                    : <><Play  className="w-5 h-5" />Play</>}
                </button>
                <button onClick={handleNext}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all">
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {!hasResult && !isLoading && (
            <div className="bg-gray-900 rounded-2xl p-8 flex flex-col items-center gap-3 text-gray-600">
              <UserIcon className="w-16 h-16 opacity-20" />
              <p className="text-sm">Enter text and click Translate to see the signing avatar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}