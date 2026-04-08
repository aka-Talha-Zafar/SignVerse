import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Hand, ArrowLeft, Camera, CameraOff, Volume2, Copy,
  RefreshCw, Languages, Loader2, AlertCircle, MessageSquare, Type,
  Square,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "https://talhazafar7406-signverse-api.hf.space";

/* ── Word-mode timing ─────────────────────────────────────────────────────── */
const FRAME_INTERVAL_MS = 150;          // was 300 — 2× frame rate for better temporal data
const SEND_INTERVAL_MS  = 3500;         // was 4000 — slightly faster feedback loop
const MAX_FRAMES_PER_BATCH = 20;        // was 12 — more context per classification
const MIN_FRAMES_TO_SEND = 8;           // never send fewer than this
const TRANSLATION_HOLD_MS  = 5000;
const CLIENT_MOTION_THRESHOLD = 3;
const MOTION_MEMORY_MS = 2500;          // keep "in-motion" state for 2.5s after last movement
const IDLE_BUFFER_KEEP = 10;            // keep last N frames when idle (context for sign start)

/* ── Sentence-mode timing ─────────────────────────────────────────────────── */
const SENTENCE_FRAME_INTERVAL = 200;   // faster capture for boundary detection
const SENTENCE_MAX_DURATION   = 12000; // 12s max recording
const SENTENCE_JPEG_QUALITY   = 0.65;

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ur", label: "Urdu" },
  { code: "ar", label: "Arabic" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
];

type RecognitionMode = "word" | "sentence";

interface SentenceWord {
  sign: string;
  confidence: number;
}

export default function SignToText() {
  /* ── Shared state ───────────────────────────────────────────────────────── */
  const [cameraOn,     setCameraOn]     = useState(false);
  const [translation,  setTranslation]  = useState("");
  const [confidence,   setConfidence]   = useState<number | null>(null);
  const [status,       setStatus]       = useState("Camera off");
  const [error,        setError]        = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [language,     setLanguage]     = useState("en");
  const [history,      setHistory]      = useState<string[]>([]);
  const [backendReady, setBackendReady] = useState<boolean | null>(null);
  const [mode,         setMode]         = useState<RecognitionMode>("word");

  /* ── Sentence-mode state ────────────────────────────────────────────────── */
  const [sentenceRecording, setSentenceRecording] = useState(false);
  const [sentenceElapsed,   setSentenceElapsed]   = useState(0);
  const [sentenceWords,     setSentenceWords]     = useState<SentenceWord[]>([]);
  const [sentenceReady,     setSentenceReady]     = useState<boolean | null>(null);

  /* ── Refs ────────────────────────────────────────────────────────────────── */
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const framesRef       = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  const languageRef     = useRef(language);
  const lastTranslationTimeRef = useRef(0);
  const prevFrameDataRef = useRef<ImageData | null>(null);
  const lastMotionTimeRef = useRef(0);

  const sentenceFramesRef  = useRef<string[]>([]);
  const sentenceTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentenceElapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentenceStartRef   = useRef(0);

  useEffect(() => { languageRef.current = language; }, [language]);

  /* ── Backend health check ───────────────────────────────────────────────── */
  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then(r => r.json())
      .then(d => {
        setBackendReady(d.sign2text === true);
        setSentenceReady(d.sign2sentence === true);
      })
      .catch(() => { setBackendReady(false); setSentenceReady(false); });
  }, []);

  /* ══════════════════════════════════════════════════════════════════════════
     WORD MODE — existing logic, unchanged
     ══════════════════════════════════════════════════════════════════════════ */
  const captureFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width  = video.videoWidth  || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (prevFrameDataRef.current) {
      const prev = prevFrameDataRef.current.data;
      const curr = currentData.data;
      let totalDiff = 0;
      let count = 0;
      const step = 16;
      for (let i = 0; i < curr.length; i += 4 * step) {
        totalDiff += Math.abs(curr[i] - prev[i])
                   + Math.abs(curr[i + 1] - prev[i + 1])
                   + Math.abs(curr[i + 2] - prev[i + 2]);
        count++;
      }
      if (count > 0 && totalDiff / (count * 3) > CLIENT_MOTION_THRESHOLD) {
        lastMotionTimeRef.current = Date.now();
      }
    }
    prevFrameDataRef.current = currentData;

    framesRef.current.push(canvas.toDataURL("image/jpeg", 0.75));
    if (framesRef.current.length > MAX_FRAMES_PER_BATCH * 2) {
      framesRef.current = framesRef.current.slice(-MAX_FRAMES_PER_BATCH);
    }
  }, []);

  const sendFrames = useCallback(async () => {
    if (isProcessingRef.current) return;
    if (framesRef.current.length === 0) return;

    const hasRecentMotion =
      Date.now() - lastMotionTimeRef.current < MOTION_MEMORY_MS;

    if (!hasRecentMotion) {
      // No recent motion — keep a rolling context buffer (not just 4 frames)
      // so when the user starts signing, pre-sign frames are available
      if (framesRef.current.length > IDLE_BUFFER_KEEP) {
        framesRef.current = framesRef.current.slice(-IDLE_BUFFER_KEEP);
      }
      return;
    }

    // Motion detected recently, but wait until we have enough frames
    if (framesRef.current.length < MIN_FRAMES_TO_SEND) {
      return;
    }

    const frames = framesRef.current.slice(-MAX_FRAMES_PER_BATCH);
    framesRef.current = [];

    isProcessingRef.current = true;
    setIsProcessing(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/sign-to-text`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ frames, language: languageRef.current }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const data = await res.json();

      if (data.no_sign_detected) {
        if (Date.now() - lastTranslationTimeRef.current < TRANSLATION_HOLD_MS) return;
        setStatus(data.message || "Ready — start signing to translate");
        return;
      }

      if (data.translation && data.translation.trim()) {
        setTranslation(data.translation);
        setConfidence(data.confidence ?? null);
        setStatus("Translating your signs...");
        lastTranslationTimeRef.current = Date.now();
        setHistory(prev => {
          if (prev[0] === data.translation) return prev;
          return [data.translation, ...prev.slice(0, 9)];
        });

        if (data.audio_url && languageRef.current !== "en") {
          new Audio(data.audio_url).play().catch(() => {});
        }
      }

    } catch (e: any) {
      setError(`Translation error: ${e.message}`);
      setStatus("Error — retrying next batch");
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, []);

  /* ══════════════════════════════════════════════════════════════════════════
     SENTENCE MODE — new logic
     ══════════════════════════════════════════════════════════════════════════ */
  const captureSentenceFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width  = video.videoWidth  || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    sentenceFramesRef.current.push(canvas.toDataURL("image/jpeg", SENTENCE_JPEG_QUALITY));
  }, []);

  const stopSentenceRecording = useCallback(() => {
    if (sentenceTimerRef.current)   clearInterval(sentenceTimerRef.current);
    if (sentenceElapsedRef.current) clearInterval(sentenceElapsedRef.current);
    sentenceTimerRef.current   = null;
    sentenceElapsedRef.current = null;
    setSentenceRecording(false);
  }, []);

  const sendSentenceFrames = useCallback(async () => {
    stopSentenceRecording();

    const frames = sentenceFramesRef.current;
    sentenceFramesRef.current = [];

    if (frames.length < 5) {
      setError("Too few frames captured — try signing for longer");
      return;
    }

    setIsProcessing(true);
    isProcessingRef.current = true;
    setStatus("Analyzing sentence...");
    setError("");
    setSentenceWords([]);

    try {
      const res = await fetch(`${API_BASE}/api/sign-to-sentence`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ frames, language: languageRef.current }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const data = await res.json();

      if (data.no_sign_detected) {
        setStatus(data.message || "No signs detected — try again");
        return;
      }

      if (data.sentence) {
        setTranslation(data.sentence);
        setConfidence(data.confidence ?? null);
        setSentenceWords(data.words || []);
        setStatus(`Detected ${data.words?.length || 0} signs → sentence`);
        setHistory(prev => {
          if (prev[0] === data.sentence) return prev;
          return [data.sentence, ...prev.slice(0, 9)];
        });

        if (data.audio_url && languageRef.current !== "en") {
          new Audio(data.audio_url).play().catch(() => {});
        }
      }
    } catch (e: any) {
      setError(`Sentence error: ${e.message}`);
      setStatus("Error processing sentence");
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [stopSentenceRecording]);

  const startSentenceRecording = useCallback(() => {
    sentenceFramesRef.current = [];
    sentenceStartRef.current  = Date.now();
    setSentenceRecording(true);
    setSentenceElapsed(0);
    setSentenceWords([]);
    setTranslation("");
    setConfidence(null);
    setStatus("Recording sentence — sign your words, then press Done");

    sentenceTimerRef.current = setInterval(captureSentenceFrame, SENTENCE_FRAME_INTERVAL);

    sentenceElapsedRef.current = setInterval(() => {
      const elapsed = Date.now() - sentenceStartRef.current;
      setSentenceElapsed(elapsed);
      if (elapsed >= SENTENCE_MAX_DURATION) {
        sendSentenceFrames();
      }
    }, 200);
  }, [captureSentenceFrame, sendSentenceFrames]);

  /* ══════════════════════════════════════════════════════════════════════════
     CAMERA START / STOP
     ══════════════════════════════════════════════════════════════════════════ */
  const captureTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      framesRef.current = [];
      sentenceFramesRef.current = [];
      isProcessingRef.current = false;
      lastMotionTimeRef.current = 0;
      prevFrameDataRef.current = null;
      lastTranslationTimeRef.current = 0;
      setCameraOn(true);
      setStatus(mode === "word"
        ? "Camera active — signing..."
        : "Camera active — press Record to start sentence");

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject  = stream;
          videoRef.current.muted      = true;
          videoRef.current.playsInline = true;
          videoRef.current.play().catch(console.error);
        }
        if (mode === "word") {
          captureTimerRef.current = setInterval(captureFrame, FRAME_INTERVAL_MS);
          sendTimerRef.current    = setInterval(sendFrames,   SEND_INTERVAL_MS);
        }
      }, 150);
    } catch {
      setError("Camera access denied. Please allow camera permission in your browser.");
      setCameraOn(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (captureTimerRef.current)    clearInterval(captureTimerRef.current);
    if (sendTimerRef.current)       clearInterval(sendTimerRef.current);
    if (sentenceTimerRef.current)   clearInterval(sentenceTimerRef.current);
    if (sentenceElapsedRef.current) clearInterval(sentenceElapsedRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current       = null;
    framesRef.current       = [];
    sentenceFramesRef.current = [];
    isProcessingRef.current = false;
    lastMotionTimeRef.current = 0;
    prevFrameDataRef.current  = null;
    lastTranslationTimeRef.current = 0;
    setCameraOn(false);
    setIsProcessing(false);
    setSentenceRecording(false);
    setSentenceElapsed(0);
    setStatus("Camera off");
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  /* ── Mode switch (stop timers, restart appropriate ones) ────────────────── */
  const handleModeSwitch = (newMode: RecognitionMode) => {
    if (newMode === mode) return;
    stopSentenceRecording();
    if (captureTimerRef.current) { clearInterval(captureTimerRef.current); captureTimerRef.current = null; }
    if (sendTimerRef.current)    { clearInterval(sendTimerRef.current);    sendTimerRef.current = null; }
    framesRef.current = [];
    sentenceFramesRef.current = [];
    setTranslation("");
    setConfidence(null);
    setSentenceWords([]);
    setError("");

    setMode(newMode);
    if (cameraOn) {
      if (newMode === "word") {
        captureTimerRef.current = setInterval(captureFrame, FRAME_INTERVAL_MS);
        sendTimerRef.current    = setInterval(sendFrames,   SEND_INTERVAL_MS);
        setStatus("Camera active — signing...");
      } else {
        setStatus("Camera active — press Record to start sentence");
      }
    }
  };

  /* ── Speak / copy helpers ───────────────────────────────────────────────── */
  const speakText = () => {
    if (!translation) return;
    window.speechSynthesis?.cancel();
    const utt = new SpeechSynthesisUtterance(translation);
    utt.lang  = language;
    window.speechSynthesis?.speak(utt);
  };
  const copyText = () => { if (translation) navigator.clipboard.writeText(translation); };

  /* ── Confidence colour helper ───────────────────────────────────────────── */
  const confColour = (c: number) =>
    c > 0.7 ? "bg-green-900/50 text-green-400"
    : c > 0.5 ? "bg-yellow-900/50 text-yellow-400"
    : "bg-red-900/50 text-red-400";

  const progressPct = Math.min(100, (sentenceElapsed / SENTENCE_MAX_DURATION) * 100);

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
              <AlertCircle className="w-4 h-4" />Backend waking up…
            </span>
          )}
          {backendReady === true && (
            <span className="text-green-400 text-xs">● Backend ready</span>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 grid lg:grid-cols-2 gap-6">

        {/* ── Camera panel ───────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex bg-gray-900 rounded-xl p-1">
            <button
              onClick={() => handleModeSwitch("word")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
                text-sm font-medium transition-all ${
                mode === "word"
                  ? "bg-purple-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white"}`}
            >
              <Type className="w-4 h-4" />Word Mode
            </button>
            <button
              onClick={() => handleModeSwitch("sentence")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
                text-sm font-medium transition-all ${
                mode === "sentence"
                  ? "bg-purple-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white"}`}
            >
              <MessageSquare className="w-4 h-4" />Sentence Mode
            </button>
          </div>

          <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video">
            {cameraOn ? (
              <>
                <video
                  ref={videoRef} autoPlay muted playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Live / recording badge */}
                <div className={`absolute top-3 left-3 flex items-center gap-2
                  rounded-full px-3 py-1 text-xs font-semibold ${
                  sentenceRecording ? "bg-orange-500/90" : "bg-red-500/80"}`}>
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  {sentenceRecording ? "REC SENTENCE" : "LIVE"}
                </div>

                {/* Sentence recording progress bar */}
                {sentenceRecording && (
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800/80">
                    <div
                      className="h-full bg-orange-500 transition-all duration-200"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}

                {isProcessing && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-2
                                  bg-black/60 rounded-full px-3 py-1 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin text-purple-400" />Processing…
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500">
                <Camera className="w-16 h-16 opacity-30" />
                <p className="text-sm">Click &quot;Start Camera&quot; to begin</p>
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
              {cameraOn
                ? <><CameraOff className="w-5 h-5" />Stop</>
                : <><Camera   className="w-5 h-5" />Start Camera</>}
            </button>

            {/* Sentence record / done buttons */}
            {mode === "sentence" && cameraOn && !isProcessing && (
              sentenceRecording ? (
                <button
                  onClick={sendSentenceFrames}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                    font-semibold bg-orange-600 hover:bg-orange-700 transition-all"
                >
                  <Square className="w-4 h-4" />
                  Done ({Math.ceil((SENTENCE_MAX_DURATION - sentenceElapsed) / 1000)}s)
                </button>
              ) : (
                <button
                  onClick={startSentenceRecording}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                    font-semibold bg-green-600 hover:bg-green-700 transition-all"
                >
                  <Camera className="w-4 h-4" />Record
                </button>
              )
            )}

            <div className="relative">
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="appearance-none bg-gray-800 border border-gray-700 rounded-xl
                           px-4 py-3 pr-8 text-sm focus:outline-none focus:border-purple-500"
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
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

        {/* ── Translation panel ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl p-5 min-h-[12rem] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                {mode === "sentence" ? "Sentence" : "Translation"}
              </h2>
              {confidence !== null && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${confColour(confidence)}`}>
                  {Math.round(confidence * 100)}% conf
                </span>
              )}
            </div>

            <div className="flex-1">
              {translation ? (
                <p className="text-2xl font-medium leading-relaxed text-white">{translation}</p>
              ) : (
                <p className="text-gray-600 italic text-sm mt-4">
                  {!cameraOn
                    ? "Start the camera and begin signing"
                    : mode === "word"
                      ? "Sign in front of the camera — translation will appear here…"
                      : "Press Record, sign 2–4 words with brief pauses, then press Done"}
                </p>
              )}
            </div>

            {/* Detected words (sentence mode) */}
            {mode === "sentence" && sentenceWords.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-800">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Detected Signs</p>
                <div className="flex flex-wrap gap-2">
                  {sentenceWords.map((w, i) => (
                    <span key={i}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                        font-medium ${confColour(w.confidence)}`}>
                      {w.sign}
                      <span className="text-xs opacity-70">{Math.round(w.confidence * 100)}%</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {translation && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                <button onClick={speakText}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-purple-400 transition-colors">
                  <Volume2 className="w-4 h-4" />Speak
                </button>
                <button onClick={copyText}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-purple-400 transition-colors">
                  <Copy className="w-4 h-4" />Copy
                </button>
                <button onClick={() => { setTranslation(""); setConfidence(null); setSentenceWords([]); }}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-400 transition-colors ml-auto">
                  <RefreshCw className="w-4 h-4" />Clear
                </button>
              </div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-gray-900 rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i}
                    onClick={() => setTranslation(h)}
                    className="text-sm text-gray-300 hover:text-white px-3 py-2
                               bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors">
                    {h}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-purple-900/20 border border-purple-800/40 rounded-xl p-4 text-sm text-purple-300">
            <p className="font-semibold mb-1">
              {mode === "word" ? "Tips for Word Mode" : "Tips for Sentence Mode"}
            </p>
            {mode === "word" ? (
              <ul className="text-purple-400 space-y-1 text-xs list-disc list-inside">
                <li>Good lighting on your hands — avoid backlight</li>
                <li>Keep your full arm visible in frame</li>
                <li>Sign clearly and hold each sign for ~2 seconds</li>
                <li>Make sure hands are clearly separated from background</li>
                <li>First translation may take a few seconds (backend waking up)</li>
              </ul>
            ) : (
              <ul className="text-purple-400 space-y-1 text-xs list-disc list-inside">
                <li>Press Record, then sign 2–4 words in sequence</li>
                <li>Pause briefly (half a second) between each sign</li>
                <li>Press Done when finished — or it auto-stops at 12 seconds</li>
                <li>Works best with common daily phrases (e.g. &quot;water please&quot;, &quot;go home now&quot;)</li>
                <li>Good lighting and clear hand visibility still matter</li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}