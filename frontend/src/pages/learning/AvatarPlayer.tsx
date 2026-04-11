import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Loader2 } from "lucide-react";
import { fetchAvatarFrames } from "@/lib/learningApi";

const SKELETON_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [0, 1], [0, 4], [1, 2], [4, 5],
];

const JOINT_COLORS: Record<number, string> = {
  0: "#f472b6", 11: "#818cf8", 12: "#818cf8",
  13: "#a78bfa", 14: "#a78bfa", 15: "#c4b5fd",
  16: "#c4b5fd", 23: "#6ee7b7", 24: "#6ee7b7",
};

interface Landmark { x: number; y: number; z: number; visibility?: number }
interface Frame { landmarks: Landmark[]; timestamp: number }

interface Props {
  word: string;
  autoPlay?: boolean;
  compact?: boolean;
}

export default function AvatarPlayer({ word, autoPlay = false, compact = false }: Props) {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [error, setError] = useState("");
  const [fps, setFps] = useState(30);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameIdx = useRef(0);
  const prevWord = useRef("");

  const drawFrame = useCallback((frameData: Frame, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx || !frameData?.landmarks?.length) return;
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0f0f1a";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(139,92,246,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(i * W / 8, 0); ctx.lineTo(i * W / 8, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * H / 8); ctx.lineTo(W, i * H / 8); ctx.stroke();
    }

    const lm = frameData.landmarks;
    const px = (l: Landmark) => l.x * W;
    const py = (l: Landmark) => l.y * H;

    SKELETON_CONNECTIONS.forEach(([a, b]) => {
      if (!lm[a] || !lm[b]) return;
      const vis = Math.min(lm[a].visibility ?? 1, lm[b].visibility ?? 1);
      if (vis < 0.1) return;
      ctx.beginPath();
      ctx.moveTo(px(lm[a]), py(lm[a]));
      ctx.lineTo(px(lm[b]), py(lm[b]));
      const isArm = [11, 12, 13, 14, 15, 16].includes(a) || [11, 12, 13, 14, 15, 16].includes(b);
      ctx.strokeStyle = isArm ? `rgba(167,139,250,${vis * 0.9})` : `rgba(110,231,183,${vis * 0.7})`;
      ctx.lineWidth = isArm ? 4 : 3;
      ctx.lineCap = "round";
      ctx.stroke();
    });

    lm.forEach((point, i) => {
      const vis = point.visibility ?? 1;
      if (vis < 0.1) return;
      const x = px(point), y = py(point);
      const r = [0, 11, 12, 23, 24].includes(i) ? 6 : [13, 14, 15, 16].includes(i) ? 5 : 3;
      const color = JOINT_COLORS[i] || "#ffffff";
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, []);

  const stopAnimation = useCallback(() => {
    if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }
    setIsPlaying(false);
  }, []);

  const startAnimation = useCallback((frameList: Frame[], fpsRate: number) => {
    stopAnimation();
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
  }, [drawFrame, stopAnimation]);

  useEffect(() => () => stopAnimation(), [stopAnimation]);

  useEffect(() => {
    if (!word || word === prevWord.current) return;
    prevWord.current = word;
    setError("");
    setIsLoading(true);
    stopAnimation();

    fetchAvatarFrames(word)
      .then((data) => {
        if (!data.frames?.length) throw new Error("No frames");
        setFrames(data.frames);
        setFps(data.fps || 30);
        setTimeout(() => {
          const canvas = canvasRef.current;
          if (canvas && data.frames[0]) drawFrame(data.frames[0], canvas);
          if (autoPlay) startAnimation(data.frames, data.fps || 30);
        }, 50);
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [word, autoPlay, drawFrame, startAnimation, stopAnimation]);

  const size = compact ? 280 : 380;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden bg-gray-900 border border-white/10" style={{ maxWidth: size }}>
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="w-full aspect-square"
          style={{ background: "#0f0f1a" }}
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading avatar...
        </div>
      )}

      {error && <p className="text-red-400 text-xs text-center">{error}</p>}

      {frames.length > 0 && !isLoading && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => { stopAnimation(); frameIdx.current = 0; setCurrentFrame(0); if (canvasRef.current && frames[0]) drawFrame(frames[0], canvasRef.current); }}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={isPlaying ? stopAnimation : () => startAnimation(frames, fps)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center gap-1.5 transition-all"
          >
            {isPlaying ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Play</>}
          </button>
          <span className="text-xs text-gray-500">
            {currentFrame + 1}/{frames.length}
          </span>
        </div>
      )}
    </div>
  );
}
