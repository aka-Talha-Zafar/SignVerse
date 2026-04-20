import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Loader2, SkipForward, SkipBack } from "lucide-react";
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
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLooping, setIsLooping] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaFrameIdx = useRef(0);
  const mannequinRafRef = useRef<number | null>(null);
  const engine = useRef({ anim: [] as MannequinFrame[], fi: 0, lastTime: 0, accumulator: 0 });
  const isPlayingRef = useRef(false);
  const isLoopingRef = useRef(true);
  const prevMannequinFramesRef = useRef<MannequinFrame[] | null>(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

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
          mediaFrameIdx.current = 0;
          setTimeout(() => {
            if (cancelled || !canvasRef.current) return;
            const first = (frames as MediaPipeFrame[])[0];
            if (first) drawMediaPipeFrame(first, canvasRef.current);
            setCurrentFrame(0);
            if (autoPlay) setIsPlaying(true);
            else setIsPlaying(false);
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
  }, [word, autoPlay, stopAll]);

  useEffect(() => {
    if (format !== "mannequin" || mannequinFrames.length === 0) {
      stopMannequinRaf();
      return;
    }

    engine.current.anim = mannequinFrames;
    if (prevMannequinFramesRef.current !== mannequinFrames) {
      engine.current.fi = 0;
      engine.current.lastTime = 0;
      engine.current.accumulator = 0;
      prevMannequinFramesRef.current = mannequinFrames;
    }

    const loop = (time: number) => {
      const en = engine.current;
      if (!en.lastTime) en.lastTime = time;
      const dt = time - en.lastTime;
      en.lastTime = time;

      if (isPlayingRef.current && en.anim.length > 0) {
        en.accumulator += dt;
        const frameDuration = 1000 / (fps * playbackSpeed);
        while (en.accumulator >= frameDuration) {
          en.accumulator -= frameDuration;
          en.fi++;
          if (en.fi >= en.anim.length) {
            if (isLoopingRef.current) {
              en.fi = 0;
            } else {
              en.fi = en.anim.length - 1;
              setIsPlaying(false);
            }
          }
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
  }, [format, mannequinFrames, fps, playbackSpeed, stopMannequinRaf]);

  /** MediaPipe clips: drive frames from interval (speed + loop match Text to Sign). */
  useEffect(() => {
    if (format !== "mediapipe" || mediaFrames.length === 0) {
      stopMediaAnimation();
      return;
    }

    if (!isPlaying) {
      stopMediaAnimation();
      const canvas = canvasRef.current;
      if (canvas && mediaFrames[mediaFrameIdx.current]) {
        drawMediaPipeFrame(mediaFrames[mediaFrameIdx.current], canvas);
      }
      return;
    }

    const period = Math.max(16, 1000 / (fps * playbackSpeed));
    stopMediaAnimation();
    mediaIntervalRef.current = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas || mediaFrames.length === 0) return;
      drawMediaPipeFrame(mediaFrames[mediaFrameIdx.current], canvas);
      setCurrentFrame(mediaFrameIdx.current);

      const next = mediaFrameIdx.current + 1;
      if (next >= mediaFrames.length) {
        if (isLoopingRef.current) {
          mediaFrameIdx.current = 0;
        } else {
          mediaFrameIdx.current = mediaFrames.length - 1;
          setIsPlaying(false);
        }
      } else {
        mediaFrameIdx.current = next;
      }
    }, period);

    return () => {
      if (mediaIntervalRef.current) {
        clearInterval(mediaIntervalRef.current);
        mediaIntervalRef.current = null;
      }
    };
  }, [format, mediaFrames, isPlaying, fps, playbackSpeed, stopMediaAnimation]);

  const size = compact ? 360 : 520;
  const frameCount = format === "mannequin" ? mannequinFrames.length : mediaFrames.length;

  const handleReset = () => {
    if (format === "mannequin") {
      engine.current.fi = 0;
      engine.current.accumulator = 0;
      setCurrentFrame(0);
      if (canvasRef.current && mannequinFrames[0]) {
        drawMannequinFrame(mannequinFrames[0], canvasRef.current);
      }
    } else if (format === "mediapipe") {
      mediaFrameIdx.current = 0;
      setCurrentFrame(0);
      if (canvasRef.current && mediaFrames[0]) {
        drawMediaPipeFrame(mediaFrames[0], canvasRef.current);
      }
    }
    setIsPlaying(true);
  };

  const handlePrev = () => {
    setIsPlaying(false);
    if (format === "mannequin" && engine.current.anim.length > 0) {
      engine.current.fi = Math.max(0, engine.current.fi - 1);
      engine.current.accumulator = 0;
      setCurrentFrame(engine.current.fi);
      if (canvasRef.current) {
        drawMannequinFrame(engine.current.anim[engine.current.fi], canvasRef.current);
      }
    } else if (format === "mediapipe" && mediaFrames.length > 0) {
      mediaFrameIdx.current = Math.max(0, mediaFrameIdx.current - 1);
      setCurrentFrame(mediaFrameIdx.current);
      if (canvasRef.current) {
        drawMediaPipeFrame(mediaFrames[mediaFrameIdx.current], canvasRef.current);
      }
    }
  };

  const handleNext = () => {
    setIsPlaying(false);
    if (format === "mannequin" && engine.current.anim.length > 0) {
      engine.current.fi = Math.min(engine.current.anim.length - 1, engine.current.fi + 1);
      engine.current.accumulator = 0;
      setCurrentFrame(engine.current.fi);
      if (canvasRef.current) {
        drawMannequinFrame(engine.current.anim[engine.current.fi], canvasRef.current);
      }
    } else if (format === "mediapipe" && mediaFrames.length > 0) {
      mediaFrameIdx.current = Math.min(mediaFrames.length - 1, mediaFrameIdx.current + 1);
      setCurrentFrame(mediaFrameIdx.current);
      if (canvasRef.current) {
        drawMediaPipeFrame(mediaFrames[mediaFrameIdx.current], canvasRef.current);
      }
    }
  };

  const progressPct =
    frameCount <= 1 ? 100 : (currentFrame / Math.max(1, frameCount - 1)) * 100;

  return (
    <div className="space-y-3 w-full" style={{ maxWidth: size }}>
      <div className="rounded-2xl overflow-hidden bg-black/40 border border-white/10">
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
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Frame {currentFrame + 1}
            </span>
            <span>{frameCount} total</span>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handlePrev}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-400 hover:text-white transition-all border border-white/10"
              aria-label="Previous frame"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-400 hover:text-white transition-all border border-white/10"
              aria-label="Restart"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="px-6 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 transition-all"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" /> Play
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-400 hover:text-white transition-all border border-white/10"
              aria-label="Next frame"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setIsLooping(!isLooping)}
              className={`ml-4 px-4 py-2 text-xs font-bold rounded-xl transition-all border ${
                isLooping
                  ? "bg-emerald-600 text-white border-emerald-500/50"
                  : "bg-white/5 text-gray-400 border-white/10"
              }`}
            >
              🔁 Loop {isLooping ? "" : "Off"}
            </button>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 ml-2">
              <label htmlFor="learn-playback-speed">{playbackSpeed.toFixed(2)}x</label>
              <input
                id="learn-playback-speed"
                type="range"
                min={0.25}
                max={2}
                step={0.25}
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="w-20 accent-[hsl(217_91%_60%)]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
