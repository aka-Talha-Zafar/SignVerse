import { useState, useMemo, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, RotateCcw, ArrowRight, Camera, CameraOff, Aperture, Loader2 } from "lucide-react";
import { ALPHABETS, shuffleArray } from "@/lib/learningData";
import { addQuizResult } from "@/lib/learningProgress";
import { verifyAlphabetSnapshot } from "@/lib/learningApi";

const QUIZ_COUNT = 5;
const JPEG_QUALITY = 0.82;

function generateLetters(): string[] {
  return shuffleArray(ALPHABETS).slice(0, QUIZ_COUNT);
}

export default function QuizAlphabets() {
  const [letters, setLetters] = useState<string[]>(() => generateLetters());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showFinal, setShowFinal] = useState(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; message: string } | null>(null);
  const pendingAnswerRef = useRef<boolean | null>(null);
  const resultsSavedRef = useRef(false);
  const answersRef = useRef<boolean[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const score = useMemo(() => answers.filter(Boolean).length, [answers]);
  const targetLetter = letters[currentIdx];
  answersRef.current = answers;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

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
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.muted = true;
          v.playsInline = true;
          v.play().catch(() => {});
        }
      }, 100);
    } catch {
      setError("Camera access denied. Please allow camera permission.");
    }
  };

  const captureAndVerify = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      setError("Camera not ready — wait a moment and try again.");
      return;
    }
    setError("");
    setIsProcessing(true);
    setResult(null);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    const frame = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

    try {
      const v = await verifyAlphabetSnapshot(frame, targetLetter);
      setResult({ correct: v.correct, message: v.message });
      pendingAnswerRef.current = v.correct;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Prediction failed";
      setResult({ correct: false, message: msg });
      pendingAnswerRef.current = false;
    } finally {
      setIsProcessing(false);
    }
  }, [targetLetter]);

  useLayoutEffect(() => {
    if (pendingAnswerRef.current === null) return;
    const v = pendingAnswerRef.current;
    pendingAnswerRef.current = null;
    setAnswers((prev) => [...prev, v]);
  }, [result]);

  const goNext = () => {
    if (currentIdx < letters.length - 1) {
      setCurrentIdx((i) => i + 1);
      setResult(null);
      setError("");
    } else {
      if (resultsSavedRef.current) return;
      resultsSavedRef.current = true;
      const finalScore = answersRef.current.filter(Boolean).length;
      addQuizResult({
        score: finalScore,
        total: letters.length,
        date: new Date().toISOString(),
        mode: "alphabets",
      });
      setShowFinal(true);
    }
  };

  const restart = () => {
    resultsSavedRef.current = false;
    pendingAnswerRef.current = null;
    setLetters(generateLetters());
    setCurrentIdx(0);
    setAnswers([]);
    setShowFinal(false);
    setResult(null);
    setError("");
    setIsProcessing(false);
    stopCamera();
  };

  if (showFinal) {
    const pct = Math.round((score / letters.length) * 100);
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <header className="border-b border-gray-800 bg-gray-950/90 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
            <Link to="/learning/quiz" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Quiz</span>
            </Link>
            <h1 className="text-lg font-bold">Results</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-6 max-w-md">
            <Trophy className={`w-20 h-20 mx-auto ${pct >= 80 ? "text-yellow-400" : pct >= 50 ? "text-gray-300" : "text-red-400"}`} />
            <h2 className="text-4xl font-bold">{score}/{letters.length}</h2>
            <p className="text-gray-400">
              {pct >= 80 ? "Excellent! Your alphabet signing is on point." : pct >= 50 ? "Good job! Keep practicing each letter." : "Keep going — clear lighting and hand framing help a lot."}
            </p>
            <div className="w-full bg-gray-800 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-1000 ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={restart}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" /> Try Again
              </button>
              <Link to="/learning/quiz" className="flex-1 py-3 rounded-xl border border-white/10 font-semibold text-center hover:bg-white/5 transition-all">
                Back to Quiz
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link to="/learning/quiz" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Quiz</span>
          </Link>
          <h1 className="text-lg font-bold">Alphabet Quiz</h1>
          <span className="ml-auto text-sm text-gray-400">{currentIdx + 1}/{letters.length}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(currentIdx / letters.length) * 100}%` }} />
        </div>

        <div className="text-center space-y-2">
          <p className="text-gray-400 text-sm">Perform the ASL sign for letter:</p>
          <p className="text-5xl font-bold text-emerald-400">{targetLetter}</p>
          <p className="text-gray-500 text-xs max-w-md mx-auto">
            Start the camera, hold the sign clearly in frame, then tap <strong>Capture</strong>. One still image is sent to your alphabet model on the same backend as Sign-to-Text.
          </p>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-gray-900 border border-white/10 aspect-video max-w-md mx-auto">
          {cameraOn ? (
            <>
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
              <canvas ref={canvasRef} className="hidden" />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  <span className="text-sm text-gray-300">Reading your sign…</span>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
              <Camera className="w-12 h-12 opacity-30" />
              <p className="text-xs px-4 text-center">Turn on the camera to begin</p>
            </div>
          )}
        </div>

        {error && (
          <div className="max-w-md mx-auto rounded-xl p-3 bg-red-900/30 border border-red-800 text-red-200 text-sm text-center">{error}</div>
        )}

        {result && (
          <div
            className={`max-w-md mx-auto rounded-xl p-4 border text-sm ${
              result.correct ? "bg-emerald-900/25 border-emerald-700 text-emerald-200" : "bg-red-900/25 border-red-800 text-red-200"
            }`}
          >
            {result.message}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
          <button
            type="button"
            onClick={cameraOn ? stopCamera : startCamera}
            disabled={isProcessing}
            className={`flex items-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm transition-all disabled:opacity-40 ${
              cameraOn ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {cameraOn ? <><CameraOff className="w-4 h-4" /> Stop camera</> : <><Camera className="w-4 h-4" /> Start camera</>}
          </button>

          {cameraOn && (
            <button
              type="button"
              onClick={captureAndVerify}
              disabled={isProcessing || answers.length > currentIdx}
              className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 font-medium text-sm transition-all disabled:opacity-40"
            >
              <Aperture className="w-4 h-4" /> Capture &amp; check
            </button>
          )}
        </div>

        {answers.length > currentIdx && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={goNext}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-medium text-sm flex items-center gap-2 transition-all"
            >
              {currentIdx < letters.length - 1 ? (
                <>
                  Next letter <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  See results <Trophy className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        <div className="flex justify-center gap-2 pt-2">
          {letters.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i < answers.length ? (answers[i] ? "bg-emerald-500" : "bg-red-500") : i === currentIdx ? "bg-white" : "bg-gray-700"
              }`}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
