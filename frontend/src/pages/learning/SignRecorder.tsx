import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, CameraOff, Circle, Square, Loader2, CheckCircle, XCircle } from "lucide-react";

const FRAME_INTERVAL = 150;
const MAX_DURATION = 5000;
const JPEG_QUALITY = 0.75;

interface Props {
  onRecordingComplete: (frames: string[]) => void;
  isProcessing: boolean;
  result: { correct: boolean; message: string } | null;
  disabled?: boolean;
}

export default function SignRecorder({ onRecordingComplete, isProcessing, result, disabled }: Props) {
  const [cameraOn, setCameraOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const framesRef = useRef<string[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const stopRecording = useCallback(() => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    if (elapTimerRef.current) clearInterval(elapTimerRef.current);
    recTimerRef.current = null;
    elapTimerRef.current = null;
    setIsRecording(false);
  }, []);

  const stopCamera = useCallback(() => {
    stopRecording();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, [stopRecording]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      setError("Camera access denied. Please allow camera permission.");
    }
  };

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    framesRef.current.push(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
  }, []);

  const sendRecording = useCallback(() => {
    stopRecording();
    const frames = framesRef.current;
    framesRef.current = [];
    if (frames.length < 5) {
      setError("Too few frames — hold the sign a bit longer");
      return;
    }
    onRecordingComplete(frames);
  }, [stopRecording, onRecordingComplete]);

  const startRecording = useCallback(() => {
    framesRef.current = [];
    startTimeRef.current = Date.now();
    setIsRecording(true);
    setElapsed(0);
    setError("");

    recTimerRef.current = setInterval(captureFrame, FRAME_INTERVAL);
    elapTimerRef.current = setInterval(() => {
      const el = Date.now() - startTimeRef.current;
      setElapsed(el);
      if (el >= MAX_DURATION) {
        sendRecording();
      }
    }, 200);
  }, [captureFrame, sendRecording]);

  const progressPct = Math.min(100, (elapsed / MAX_DURATION) * 100);
  const remainingSec = Math.ceil((MAX_DURATION - elapsed) / 1000);

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/10 aspect-video max-w-md">
        {cameraOn ? (
          <>
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
            <canvas ref={canvasRef} className="hidden" />
            {isRecording && (
              <>
                <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-red-500/90">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> REC
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
                  <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progressPct}%` }} />
                </div>
              </>
            )}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
            <Camera className="w-12 h-12 opacity-30" />
            <p className="text-xs">Start camera to record</p>
          </div>
        )}
      </div>

      {result && (
        <div className={`rounded-xl p-3 flex items-center gap-3 ${result.correct ? "bg-emerald-900/30 border border-emerald-700" : "bg-red-900/30 border border-red-700"}`}>
          {result.correct ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" /> : <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
          <p className={`text-sm ${result.correct ? "text-emerald-300" : "text-red-300"}`}>{result.message}</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl p-2 bg-red-900/30 border border-red-700 text-red-300 text-xs">{error}</div>
      )}

      <div className="flex gap-2">
        <button
          onClick={cameraOn ? stopCamera : startCamera}
          disabled={disabled || isProcessing}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
            cameraOn ? "bg-red-600 hover:bg-red-700 text-white" : "bg-primary hover:bg-primary/90 text-primary-foreground"
          } disabled:opacity-40`}
        >
          {cameraOn ? <><CameraOff className="w-4 h-4" /> Stop Camera</> : <><Camera className="w-4 h-4" /> Start Camera</>}
        </button>

        {cameraOn && !isProcessing && (
          isRecording ? (
            <button onClick={sendRecording} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary/90 font-medium text-sm transition-all text-primary-foreground">
              <Square className="w-4 h-4" /> Done ({remainingSec}s)
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={disabled}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 font-medium text-sm transition-all disabled:opacity-40"
            >
              <Circle className="w-4 h-4" /> Record Sign
            </button>
          )
        )}
      </div>
    </div>
  );
}
