import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Hand, ArrowLeft, Camera, CameraOff, Volume2, Copy,
  RefreshCw, Settings, Maximize2, Languages, Loader2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:7860";
const FRAME_INTERVAL_MS  = 100;   // capture frame every 100ms
const SEND_INTERVAL_MS   = 3000;  // send batch to API every 3 seconds
const MAX_FRAMES_PER_SEND = 30;   // max frames per request

const SignToText = () => {
  const [cameraOn, setCameraOn]         = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [language, setLanguage]         = useState("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError]               = useState("");
  const [status, setStatus]             = useState("Ready");

  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const framesRef   = useRef<string[]>([]);
  const captureTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sendTimerRef    = useRef<NodeJS.Timeout | null>(null);

  // ── Capture one frame from webcam ────────────────────────
  const captureFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = video.videoWidth  || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const b64 = canvas.toDataURL("image/jpeg", 0.7);
    framesRef.current.push(b64);

    // Keep buffer bounded
    if (framesRef.current.length > MAX_FRAMES_PER_SEND * 2) {
      framesRef.current = framesRef.current.slice(-MAX_FRAMES_PER_SEND);
    }
  }, []);

  // ── Send frames to API ───────────────────────────────────
  const sendFrames = useCallback(async () => {
    if (framesRef.current.length === 0 || isTranslating) return;

    const frames = framesRef.current.slice(-MAX_FRAMES_PER_SEND);
    framesRef.current = [];

    setIsTranslating(true);
    setStatus("Translating...");

    try {
      const res = await fetch(`${API_BASE}/api/sign-to-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames, language }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      if (data.translation) {
        setTranslatedText(data.translation);
        setError("");
      }
      setStatus(`Ready — confidence: ${Math.round((data.confidence || 0) * 100)}%`);
    } catch (err: any) {
      setError("Translation failed. Check if backend is running.");
      setStatus("Error");
    } finally {
      setIsTranslating(false);
    }
  }, [language, isTranslating]);

  // ── Start camera ─────────────────────────────────────────
  const startCamera = async () => {
  try {
    setError("");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" },
      audio: false,
    });

    streamRef.current = stream;
    framesRef.current = [];
    setCameraOn(true);  // set state FIRST so video element renders
    setStatus("Camera active — signing...");

    // Wait for React to render the video element, then attach stream
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play().catch(console.error);
      }
      // Start timers after stream is attached
      captureTimerRef.current = setInterval(captureFrame, FRAME_INTERVAL_MS);
      sendTimerRef.current = setInterval(sendFrames, SEND_INTERVAL_MS);
    }, 100);

  } catch (err: any) {
    setError("Could not access camera. Please allow camera permission.");
  }
};

  // ── Stop camera ──────────────────────────────────────────
  const stopCamera = () => {
    if (captureTimerRef.current) clearInterval(captureTimerRef.current);
    if (sendTimerRef.current)    clearInterval(sendTimerRef.current);

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    framesRef.current = [];
    setCameraOn(false);
    setIsTranslating(false);
    setStatus("Ready");
  };

  const handleToggleCamera = () => {
    if (cameraOn) stopCamera();
    else startCamera();
  };

  const handleCopy = () => {
    if (translatedText) navigator.clipboard.writeText(translatedText);
  };

  const handleSpeak = () => {
    if (!translatedText) return;
    const utter = new SpeechSynthesisUtterance(translatedText);
    utter.lang = language === "ur" ? "ur-PK"
               : language === "es" ? "es-ES"
               : language === "fr" ? "fr-FR"
               : language === "ar" ? "ar-SA"
               : "en-US";
    speechSynthesis.speak(utter);
  };

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), []);

  // Re-register sendFrames when language changes
  useEffect(() => {
    if (cameraOn && sendTimerRef.current) {
      clearInterval(sendTimerRef.current);
      sendTimerRef.current = setInterval(sendFrames, SEND_INTERVAL_MS);
    }
  }, [language]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-solid">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold text-foreground">Sign to Text</h1>
            </div>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Camera Feed */}
          <div className="animate-fade-up">
            <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden">
              <div className="aspect-video bg-secondary/30 relative flex items-center justify-center">
                {/* Hidden canvas for frame capture */}
                <canvas ref={canvasRef} className="hidden" />

                {cameraOn ? (
                  <div className="absolute inset-0 w-full h-full bg-black">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      autoPlay
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/10 pointer-events-none" />
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs text-white font-mono bg-black/40 px-2 py-0.5 rounded">LIVE</span>
                    </div>
                    {isTranslating && (
                      <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg">
                        <Loader2 className="w-3 h-3 text-primary animate-spin" />
                        <span className="text-xs text-white font-mono">Translating...</span>
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4 text-xs text-white/80 font-mono bg-black/40 px-2 py-0.5 rounded">
                      MediaPipe · {MAX_FRAMES_PER_SEND}fps · Tracking
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <CameraOff className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Camera is off</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Click the button below to start</p>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="p-4 flex items-center justify-center gap-3 border-t border-border">
                <button
                  onClick={handleToggleCamera}
                  className={`px-6 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all duration-300 ${
                    cameraOn
                      ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25"
                  }`}
                >
                  {cameraOn ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                  {cameraOn ? "Stop" : "Start Camera"}
                </button>
                <button className="p-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Translation Output */}
          <div className="animate-fade-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
            <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm h-full flex flex-col">
              {/* Language selector */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Output Language</span>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-secondary/50 border border-border text-foreground text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="en">English</option>
                  <option value="ur">Urdu</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>

              {/* Translation area */}
              <div className="flex-1 p-6 flex items-center justify-center min-h-[200px]">
                {isTranslating ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Translating your signs...</p>
                  </div>
                ) : translatedText ? (
                  <p className="text-2xl font-semibold text-foreground text-center animate-fade-up leading-relaxed">
                    "{translatedText}"
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm text-center">
                    Start the camera and begin signing. Translation appears every 3 seconds.
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="p-4 border-t border-border flex items-center justify-center gap-3">
                <button
                  onClick={handleCopy}
                  disabled={!translatedText}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 flex items-center gap-2 transition-all disabled:opacity-40"
                >
                  <Copy className="w-4 h-4" /> Copy
                </button>
                <button
                  onClick={handleSpeak}
                  disabled={!translatedText}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 flex items-center gap-2 transition-all disabled:opacity-40"
                >
                  <Volume2 className="w-4 h-4" /> Speak
                </button>
                <button
                  onClick={() => setTranslatedText("")}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 flex items-center gap-2 transition-all"
                >
                  <RefreshCw className="w-4 h-4" /> Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Info bar */}
        <div className="mt-6 rounded-xl border border-border bg-card/60 p-4 flex flex-wrap items-center justify-between gap-4 animate-fade-up"
             style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>Model: <span className="text-foreground font-medium">3D CNN + Transformer</span></span>
            <span>NLP: <span className="text-foreground font-medium">Beam Search + BERT</span></span>
            <span>Landmarks: <span className="text-foreground font-medium">MediaPipe Pose (99)</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${cameraOn ? "bg-green-500 animate-pulse" : "bg-green-500"}`} />
            <span className="text-xs text-muted-foreground">{status}</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignToText;