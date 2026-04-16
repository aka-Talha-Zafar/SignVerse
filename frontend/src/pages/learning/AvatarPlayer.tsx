import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Loader2 } from "lucide-react";
import { fetchAvatarFrames } from "@/lib/learningApi";
import { drawMannequinFrame, isMannequinFrameList, type MannequinFrame } from "@/lib/textToSignMannequin";

const SKELETON_CONNECTIONS: [number, number][] = [
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [0, 1],
  [0, 4],
  [1, 2],
  [4, 5],
];

const JOINT_COLORS: Record<number, string> = {
  0: "#f472b6",
  11: "#818cf8",
  12: "#818cf8",
  13: "#a78bfa",
  14: "#a78bfa",
  15: "#c4b5fd",
  16: "#c4b5fd",
  23: "#6ee7b7",
  24: "#6ee7b7",
};

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}
interface MediaPipeFrame {
  landmarks: Landmark[];
  timestamp: number;
}

interface Props {
  word: string;
  autoPlay?: boolean;
  compact?: boolean;
}

type DisplayFormat = "mannequin" | "mediapipe" | "empty";

function drawMediaPipeFrame(frameData: MediaPipeFrame, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !frameData?.landmarks?.length) return;
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0f0f1a";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(139,92,246,0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo((i * W) / 8, 0);
    ctx.lineTo((i * W) / 8, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, (i * H) / 8);
    ctx.lineTo(W, (i * H) / 8);
    ctx.stroke();
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
    const x = px(point);
    const y = py(point);
    const r = [0, 11, 12, 23, 24].includes(i) ? 6 : [13, 14, 15, 16].includes(i) ? 5 : 3;
    const color = JOINT_COLORS[i] || "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

export default function AvatarPlayer({ word, autoPlay = false, compact = false }: Props) {
  const [format, setFormat] = useState<DisplayFormat>("empty");
  const [mannequinFrames, setMannequinFrames] = useState<MannequinFrame[]>([]);
  const [mediaFrames, setMediaFrames] = useState<MediaPipeFrame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [error, setError] = useState("");
  const [fps, setFps] = useState(20);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaFrameIdx = useRef(0);
  const mannequinRafRef = useRef<number | null>(null);
  const engine = useRef({ anim: [] as MannequinFrame[], fi: 0, lastTime: 0, accumulator: 0 });
  const isPlayingRef = useRef(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const stopMediaAnimation = useCallback(() => {
    if (mediaIntervalRef.current) {
      clearInterval(mediaIntervalRef.current);
      mediaIntervalRef.current = null;
    }
  }, []);

  const stopMannequinRaf = useCallback(() => {
    if (mannequinRafRef.current !== null) {
      cancelAnimationFrame(mannequinRafRef.current);
      mannequinRafRef.current = null;
    }
  }, []);

  const stopAll = useCallback(() => {
    stopMediaAnimation();
    stopMannequinRaf();
    setIsPlaying(false);
  }, [stopMediaAnimation, stopMannequinRaf]);

  const startMediaAnimation = useCallback(
    (frameList: MediaPipeFrame[], fpsRate: number) => {
      stopMediaAnimation();
      mediaFrameIdx.current = 0;
      setCurrentFrame(0);
      mediaIntervalRef.current = setInterval(() => {
        const canvas = canvasRef.current;
        if (!canvas || frameList.length === 0) return;
        drawMediaPipeFrame(frameList[mediaFrameIdx.current], canvas);
        setCurrentFrame(mediaFrameIdx.current);
        mediaFrameIdx.current = (mediaFrameIdx.current + 1) % frameList.length;
      }, 1000 / fpsRate);
      setIsPlaying(true);
    },
    [stopMediaAnimation],
  );

  useEffect(() => () => stopAll(), [stopAll]);

  useEffect(() => {
    const w = word?.trim();
    if (!w) {
      setFormat("empty");
      setMannequinFrames([]);
      setMediaFrames([]);
      return;
    }

    let cancelled = false;
    setError("");
    setIsLoading(true);
    stopAll();
    setFormat("empty");
    setMannequinFrames([]);
    setMediaFrames([]);

    fetchAvatarFrames(w)
      .then((data: { frames?: unknown[]; fps?: number }) => {
        if (cancelled) return;
        const frames = data.frames;
        if (!frames?.length) throw new Error("No animation data returned");
        const rate = typeof data.fps === "number" && data.fps > 0 ? data.fps : 20;
        setFps(rate);

        if (isMannequinFrameList(frames)) {
          setFormat("mannequin");
          setMannequinFrames(frames);
          engine.current.anim = frames;
          engine.current.fi = 0;
          engine.current.lastTime = 0;
          engine.current.accumulator = 0;
          setCurrentFrame(0);
          setTimeout(() => {
            if (cancelled || !canvasRef.current) return;
            drawMannequinFrame(frames[0], canvasRef.current);
          }, 50);
          if (autoPlay) setIsPlaying(true);
        } else {
          setFormat("mediapipe");
          setMediaFrames(frames as MediaPipeFrame[]);
          setTimeout(() => {
            if (cancelled || !canvasRef.current) return;
            const first = (frames as MediaPipeFrame[])[0];
            if (first) drawMediaPipeFrame(first, canvasRef.current);
            if (autoPlay) startMediaAnimation(frames as MediaPipeFrame[], rate);
          }, 50);
        }
      })
      .catch((e: Error) => setError(e.message || "Failed to load sign"))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      stopAll();
    };
  }, [word, autoPlay, stopAll, startMediaAnimation]);

  useEffect(() => {
    if (format !== "mannequin" || mannequinFrames.length === 0) {
      stopMannequinRaf();
      return;
    }

    engine.current.anim = mannequinFrames;
    engine.current.fi = 0;
    engine.current.lastTime = 0;
    engine.current.accumulator = 0;

    const loop = (time: number) => {
      const en = engine.current;
      if (!en.lastTime) en.lastTime = time;
      const dt = time - en.lastTime;
      en.lastTime = time;

      if (isPlayingRef.current && en.anim.length > 0) {
        en.accumulator += dt;
        const frameDuration = 1000 / fps;
        while (en.accumulator >= frameDuration) {
          en.accumulator -= frameDuration;
          en.fi++;
          if (en.fi >= en.anim.length) en.fi = 0;
        }
        setCurrentFrame(en.fi);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        drawMannequinFrame(en.anim.length > 0 ? en.anim[en.fi] : null, canvas);
      }
      mannequinRafRef.current = requestAnimationFrame(loop);
    };

    mannequinRafRef.current = requestAnimationFrame(loop);
    return () => {
      if (mannequinRafRef.current !== null) {
        cancelAnimationFrame(mannequinRafRef.current);
        mannequinRafRef.current = null;
      }
    };
  }, [format, mannequinFrames, fps, stopMannequinRaf]);

  const size = compact ? 280 : 380;
  const frameCount = format === "mannequin" ? mannequinFrames.length : mediaFrames.length;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden bg-black/40 border border-white/10" style={{ maxWidth: size }}>
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="w-full aspect-square"
          style={{ background: "hsl(220 20% 6%)" }}
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading avatar…
        </div>
      )}

      {error && <p className="text-red-400 text-xs text-center max-w-md mx-auto">{error}</p>}

      {frameCount > 0 && !isLoading && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (format === "mannequin") {
                engine.current.fi = 0;
                engine.current.accumulator = 0;
                setCurrentFrame(0);
                if (canvasRef.current && mannequinFrames[0]) {
                  drawMannequinFrame(mannequinFrames[0], canvasRef.current);
                }
              } else {
                stopMediaAnimation();
                mediaFrameIdx.current = 0;
                setCurrentFrame(0);
                if (canvasRef.current && mediaFrames[0]) {
                  drawMediaPipeFrame(mediaFrames[0], canvasRef.current);
                }
              }
            }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-gray-400 hover:text-white transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (format === "mannequin") {
                setIsPlaying((p) => !p);
              } else {
                if (isPlaying) {
                  stopMediaAnimation();
                  setIsPlaying(false);
                } else {
                  startMediaAnimation(mediaFrames, fps);
                }
              }
            }}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium flex items-center gap-1.5 transition-all"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" /> Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Play
              </>
            )}
          </button>
          <span className="text-xs text-gray-500">
            {currentFrame + 1}/{frameCount}
          </span>
        </div>
      )}
    </div>
  );
}
