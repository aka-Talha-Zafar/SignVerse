import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Hand, ArrowLeft, Camera, CameraOff, Volume2, Copy,
  RefreshCw, Settings, Maximize2, Languages, Loader2, AlertCircle,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "https://talhazafar7406-signverse-api.hf.space";

const FRAME_INTERVAL_MS = 150;   // capture a frame every 150ms
const SEND_INTERVAL_MS  = 3500;  // send batch every 3.5 seconds

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ur", label: "Urdu" },
  { code: "ar", label: "Arabic" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
];

export default function SignToText() {
  const [cameraOn,     setCameraOn]     = useState(false);
  const [translation,  setTranslation]  = useState("");
  const [confidence,   setConfidence]   = useState<number | null>(null);
  const [status,       setStatus]       = useState("Camera off");
  const [idleStatus,   setIdleStatus]   = useState("");   // shown when no motion
  const [error,        setError]        = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [language,     setLanguage]     = useState("en");
  const [history,      setHistory]      = useState<string[]>([]);
  const [backendReady, setBackendReady] = useState<boolean | null>(null);

  const videoRef        = useRef<HTMLVideoElement>(null);
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const framesRef       = useRef<string[]>([]);
  const captureTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track whether we are currently in "idle" state to avoid spamming
  const isIdleRef       = useRef(false);

  // ── Check backend health on mount ─────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then(r => r.json())
      .then(d => setBackendReady(d.sign2text === true))
      .catch(() => setBackendReady(false));
  }, []);

  // ── Capture a frame from webcam ────────────────────────────────────────────
  const captureFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width  = video.videoWidth  || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    framesRef.current.push(canvas.toDataURL("image/jpeg", 0.6));
    // Keep max 40 frames to avoid huge payloads
    if (framesRef.current.length > 40) {
      framesRef.current = framesRef.current.slice(-40);
    }
  }, []);

  // ── Send accumulated frames to backend ────────────────────────────────────
  const sendFrames = useCallback(async () => {
    if (framesRef.current.length === 0) return;
    if (isProcessing) return;

    const frames = [...framesRef.current];
    framesRef.current = [];

    setIsProcessing(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/sign-to-text`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ frames, language }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const data = await res.json();

      // ── "Still" response — no motion detected ─────────────────────────────
      // method="still" means the backend saw no wrist movement.
      // Show a status message once, then stay quiet until motion resumes.
      if (data.method === "still" || data.translation === "...") {
        if (!isIdleRef.current) {
          // First time going idle — show the idle indicator
          isIdleRef.current = true;
          setIdleStatus("👋 Ready — start signing to translate");
          setConfidence(null);
        }
        // Do NOT add to history, do NOT update translation panel
        return;
      }

      // ── Real translation received ──────────────────────────────────────────
      isIdleRef.current = false;
      setIdleStatus("");

      if (data.translation && data.translation.trim()) {
        setTranslation(data.translation);
        setConfidence(data.confidence ?? null);
        setStatus("Translating your signs...");
        // Only add meaningful translations to history (not empty/dots)
        setHistory(prev => [data.translation, ...prev.slice(0, 9)]);

        if (data.audio_url && language !== "en") {
          new Audio(data.audio_url).play().catch(() => {});
        }
      }
    } catch (e: any) {
      setError(`Translation error: ${e.message}`);
      setStatus("Error — retrying next batch");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, language]);

  // ── Start camera ──────────────────────────────────────────────────────────
  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      framesRef.current = [];
      setCameraOn(true);
      setStatus("Camera active — signing...");

      // Wait one tick so React renders the <video> element, then attach
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted     = true;
          videoRef.current.playsInline = true;
          videoRef.current.play().catch(console.error);
        }
        captureTimerRef.current = setInterval(captureFrame, FRAME_INTERVAL_MS);
        sendTimerRef.current    = setInterval(sendFrames,  SEND_INTERVAL_MS);
      }, 150);
    } catch (e: any) {
      setError("Camera access denied. Please allow camera permission in your browser.");
      setCameraOn(false);
    }
  };

  // ── Stop camera ───────────────────────────────────────────────────────────
  const stopCamera = () => {
    if (captureTimerRef.current) clearInterval(captureTimerRef.current);
    if (sendTimerRef.current)    clearInterval(sendTimerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current   = null;
    framesRef.current   = [];
    setCameraOn(false);
    setIsProcessing(false);
    setStatus("Camera off");
  };

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), []);

  // ── Speak current translation ─────────────────────────────────────────────
  const speakText = () => {
    if (!translation) return;
    window.speechSynthesis?.cancel();
    const utt = new SpeechSynthesisUtterance(translation);
    utt.lang  = language;
    window.speechSynthesis?.speak(utt);
  };

  const copyText = () => { if (translation) navigator.clipboard.writeText(translation); };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Hand className="w-6 h-6 text-purple-400" />
        <h1 className="text-xl font-bold">Sign to Text</h1>
        <div className="ml-auto flex items-center gap-2 text-sm">
          {backendReady === false && (
            <span className="text-yellow-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Backend waking up…
            </span>
          )}
          {backendReady === true && (
            <span className="text-green-400 text-xs">● Backend ready</span>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 grid lg:grid-cols-2 gap-6">
        {/* Camera panel */}
        <div className="space-y-4">
          <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video">
            {cameraOn ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute top-3 left-3 flex items-center gap-2
                                bg-red-500/80 rounded-full px-3 py-1 text-xs font-semibold">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
                {isProcessing && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-2
                                  bg-black/60 rounded-full px-3 py-1 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                    Processing…
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500">
                <Camera className="w-16 h-16 opacity-30" />
                <p className="text-sm">Click "Start Camera" to begin</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={cameraOn ? stopCamera : startCamera}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold
                transition-all ${cameraOn
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-purple-600 hover:bg-purple-700"}`}
            >
              {cameraOn ? <><CameraOff className="w-5 h-5" />Stop</> : <><Camera className="w-5 h-5" />Start Camera</>}
            </button>

            {/* Language selector */}
            <div className="relative">
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="appearance-none bg-gray-800 border border-gray-700 rounded-xl
                           px-4 py-3 pr-8 text-sm focus:outline-none focus:border-purple-500"
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
              <Languages className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Status / error */}
          <div className={`rounded-xl px-4 py-2 text-sm ${
            error
              ? "bg-red-900/40 border border-red-700 text-red-300"
              : "bg-gray-800/60 text-gray-400"}`}>
            {error
              ? <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</span>
              : status}
          </div>
        </div>

        {/* Translation panel */}
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl p-5 min-h-[12rem] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Translation</h2>
              {confidence !== null && !idleStatus && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  confidence > 0.7 ? "bg-green-900/50 text-green-400"
                  : confidence > 0.5 ? "bg-yellow-900/50 text-yellow-400"
                  : "bg-red-900/50 text-red-400"}`}>
                  {Math.round(confidence * 100)}% conf
                </span>
              )}
            </div>

            <div className="flex-1">
              {/* Idle state — show once, don't update repeatedly */}
              {idleStatus && !translation ? (
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <p className="text-gray-400 text-sm">{idleStatus}</p>
                </div>
              ) : translation ? (
                <p className="text-2xl font-medium leading-relaxed text-white">{translation}</p>
              ) : (
                <p className="text-gray-600 italic text-sm mt-4">
                  {cameraOn ? "Sign in front of the camera — translation will appear here…" : "Start the camera and begin signing"}
                </p>
              )}
            </div>

            {translation && !idleStatus && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                <button onClick={speakText}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-purple-400 transition-colors">
                  <Volume2 className="w-4 h-4" />Speak
                </button>
                <button onClick={copyText}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-purple-400 transition-colors">
                  <Copy className="w-4 h-4" />Copy
                </button>
                <button onClick={() => { setTranslation(""); setConfidence(null); setIdleStatus(""); }}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-400 transition-colors ml-auto">
                  <RefreshCw className="w-4 h-4" />Clear
                </button>
              </div>
            )}
          </div>

          {/* History — only real translations, no dots */}
          {history.length > 0 && (
            <div className="bg-gray-900 rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i}
                    onClick={() => { setTranslation(h); setIdleStatus(""); }}
                    className="text-sm text-gray-300 hover:text-white px-3 py-2
                               bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors">
                    {h}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hint */}
          <div className="bg-purple-900/20 border border-purple-800/40 rounded-xl p-4 text-sm text-purple-300">
            <p className="font-semibold mb-1">💡 Tips for better results</p>
            <ul className="text-purple-400 space-y-1 text-xs list-disc list-inside">
              <li>Good lighting on your face and hands</li>
              <li>Keep arms visible in frame</li>
              <li>Sign clearly and at a steady pace</li>
              <li>First translation may be slow (backend waking up)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}