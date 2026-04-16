import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Hand, ArrowLeft, Camera, CameraOff, Volume2, Copy,
  RefreshCw, Languages, Loader2, AlertCircle, MessageSquare, Type,
  Square, Circle,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "https://talhazafar7406-signverse-api.hf.space";

/* ── Recording limits per mode ────────────────────────────────────────────── */
const WORD_FRAME_INTERVAL   = 150;     // ms between captures (~6.7 fps)
const WORD_MAX_DURATION     = 5000;    // 5 s max for a single sign
const WORD_JPEG_QUALITY     = 0.75;

const SENTENCE_FRAME_INTERVAL = 200;   // ms between captures (~5 fps)
const SENTENCE_MAX_DURATION   = 20000; // 20 s max for a sentence
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
  const [translatedText, setTranslatedText] = useState("");
  const [confidence,   setConfidence]   = useState<number | null>(null);
  const [status,       setStatus]       = useState("Camera off");
  const [error,        setError]        = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [language,     setLanguage]     = useState("en");
  const [history,      setHistory]      = useState<string[]>([]);
  const [backendReady, setBackendReady] = useState<boolean | null>(null);
  const [mode,         setMode]         = useState<RecognitionMode>("word");

  /* ── Recording state (shared between word & sentence modes) ─────────────── */
  const [isRecording,      setIsRecording]      = useState(false);
  const [recordingElapsed, setRecordingElapsed]  = useState(0);
  const [sentenceWords,    setSentenceWords]     = useState<SentenceWord[]>([]);
  const [isTranslating,    setIsTranslating]     = useState(false);

  /* ── Refs ────────────────────────────────────────────────────────────────── */
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const recordingFramesRef = useRef<string[]>([]);
  const recordingTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartRef  = useRef(0);
  const isProcessingRef    = useRef(false);
  const languageRef        = useRef(language);
  const modeRef            = useRef(mode);

  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const maxDuration = mode === "word" ? WORD_MAX_DURATION : SENTENCE_MAX_DURATION;

  /* ── Backend health check ───────────────────────────────────────────────── */
  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then(r => r.json())
      .then(d => setBackendReady(d.sign2text === true))
      .catch(() => setBackendReady(false));
  }, []);

  /* ══════════════════════════════════════════════════════════════════════════
     UNIFIED RECORDING LOGIC — used by both word and sentence modes
     ══════════════════════════════════════════════════════════════════════════ */
  const captureRecordingFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width  = video.videoWidth  || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const q = modeRef.current === "word" ? WORD_JPEG_QUALITY : SENTENCE_JPEG_QUALITY;
    recordingFramesRef.current.push(canvas.toDataURL("image/jpeg", q));
  }, []);

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (elapsedTimerRef.current)   clearInterval(elapsedTimerRef.current);
    recordingTimerRef.current = null;
    elapsedTimerRef.current   = null;
    setIsRecording(false);
  }, []);

  /* ── Translate helper ───────────────────────────────────────────────────── */
  const translateText = useCallback(async (text: string) => {
    if (!text || languageRef.current === "en") {
      setTranslatedText("");
      return;
    }
    setIsTranslating(true);
    try {
      const res = await fetch(`${API_BASE}/api/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, target: languageRef.current }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translated && data.translated !== text) {
          setTranslatedText(data.translated);
        }
      }
    } catch {
      // translation is best-effort
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const sendRecording = useCallback(async () => {
    stopRecording();

    const frames = recordingFramesRef.current;
    recordingFramesRef.current = [];

    if (frames.length < 5) {
      setError("Too few frames captured — hold the sign a bit longer");
      return;
    }

    setIsProcessing(true);
    isProcessingRef.current = true;
    setError("");
    setSentenceWords([]);
    setTranslatedText("");

    const currentMode = modeRef.current;
    const endpoint = currentMode === "word"
      ? `${API_BASE}/api/sign-to-text`
      : `${API_BASE}/api/sign-to-sentence`;
    const statusLabel = currentMode === "word" ? "Classifying sign..." : "Analyzing sentence...";
    setStatus(statusLabel);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames, language: languageRef.current }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const data = await res.json();

      if (data.no_sign_detected) {
        setStatus(data.message || "No sign detected — try again");
        return;
      }

      const resultText = currentMode === "word"
        ? data.translation
        : data.sentence;

      if (resultText && resultText.trim()) {
        setTranslation(resultText);
        setConfidence(data.confidence ?? null);
        setStatus(currentMode === "word"
          ? `Detected: ${data.sign || "sign"}`
          : `Detected ${data.words?.length || 0} signs`);

        if (currentMode === "sentence" && data.words) {
          setSentenceWords(data.words);
        }

        setHistory(prev => {
          if (prev[0] === resultText) return prev;
          return [resultText, ...prev.slice(0, 9)];
        });

        translateText(resultText);
      }
    } catch (e: any) {
      setError(`Error: ${e.message}`);
      setStatus("Error — try recording again");
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [stopRecording, translateText]);

  const startRecording = useCallback(() => {
    recordingFramesRef.current = [];
    recordingStartRef.current  = Date.now();
    setIsRecording(true);
    setRecordingElapsed(0);
    setSentenceWords([]);
    setTranslation("");
    setTranslatedText("");
    setConfidence(null);
    setError("");

    const currentMode = modeRef.current;
    setStatus(currentMode === "word"
      ? "Recording — perform your sign, then press Done"
      : "Recording sentence — sign your words, then press Done");

    const interval = currentMode === "word" ? WORD_FRAME_INTERVAL : SENTENCE_FRAME_INTERVAL;
    recordingTimerRef.current = setInterval(captureRecordingFrame, interval);

    const dur = currentMode === "word" ? WORD_MAX_DURATION : SENTENCE_MAX_DURATION;
    elapsedTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - recordingStartRef.current;
      setRecordingElapsed(elapsed);
      if (elapsed >= dur) {
        sendRecording();
      }
    }, 200);
  }, [captureRecordingFrame, sendRecording]);

  /* ══════════════════════════════════════════════════════════════════════════
     CAMERA START / STOP
     ══════════════════════════════════════════════════════════════════════════ */
  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      recordingFramesRef.current = [];
      isProcessingRef.current = false;
      setCameraOn(true);
      setStatus("Camera active — press Record to start");

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject   = stream;
          videoRef.current.muted       = true;
          videoRef.current.playsInline = true;
          videoRef.current.play().catch(console.error);
        }
      }, 150);
    } catch {
      setError("Camera access denied. Please allow camera permission in your browser.");
      setCameraOn(false);
    }
  };

  const stopCamera = useCallback(() => {
    stopRecording();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    recordingFramesRef.current = [];
    isProcessingRef.current = false;
    setCameraOn(false);
    setIsProcessing(false);
    setIsRecording(false);
    setRecordingElapsed(0);
    setStatus("Camera off");
  }, [stopRecording]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  /* ── Mode switch ────────────────────────────────────────────────────────── */
  const handleModeSwitch = (newMode: RecognitionMode) => {
    if (newMode === mode) return;
    stopRecording();
    recordingFramesRef.current = [];
    setTranslation("");
    setTranslatedText("");
    setConfidence(null);
    setSentenceWords([]);
    setError("");
    setMode(newMode);
    if (cameraOn) {
      setStatus("Camera active — press Record to start");
    }
  };

  /* ── Re-translate when language changes ─────────────────────────────────── */
  useEffect(() => {
    if (translation && language !== "en") {
      translateText(translation);
    } else {
      setTranslatedText("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  /* ── Speak / copy helpers ───────────────────────────────────────────────── */
  const displayText = translatedText || translation;
  const speakText = () => {
    if (!displayText) return;

    if (language === "en") {
      window.speechSynthesis?.cancel();
      const utt = new SpeechSynthesisUtterance(displayText);
      utt.lang = "en";
      window.speechSynthesis?.speak(utt);
    } else {
      // Use our own backend TTS proxy — avoids CORS / referrer blocks
      const url =
        `${API_BASE}/api/tts?text=${encodeURIComponent(displayText)}` +
        `&lang=${encodeURIComponent(language)}`;
      const audio = new Audio(url);
      audio.play().catch(() => {
        // last-resort fallback to browser TTS
        window.speechSynthesis?.cancel();
        const utt = new SpeechSynthesisUtterance(displayText);
        utt.lang = language;
        window.speechSynthesis?.speak(utt);
      });
    }
  };
  const copyText = () => { if (displayText) navigator.clipboard.writeText(displayText); };

  /* ── Confidence colour helper ───────────────────────────────────────────── */
  const confColour = (c: number) =>
    c > 0.7 ? "bg-green-900/50 text-green-400"
    : c > 0.5 ? "bg-yellow-900/50 text-yellow-400"
    : "bg-red-900/50 text-red-400";

  const progressPct = Math.min(100, (recordingElapsed / maxDuration) * 100);
  const remainingSec = Math.ceil((maxDuration - recordingElapsed) / 1000);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative">
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      {/* Header */}
      <header className="sticky top-0 z-50 relative border-b border-white/5 bg-black/50 backdrop-blur-xl px-6 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Hand className="w-6 h-6 text-primary" />
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

      <div className="relative z-10 max-w-6xl mx-auto p-6 grid lg:grid-cols-2 gap-6">

        {/* ── Camera panel ───────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => handleModeSwitch("word")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
                text-sm font-medium transition-all ${
                mode === "word"
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-gray-400 hover:text-white"}`}
            >
              <Type className="w-4 h-4" />Word Mode
            </button>
            <button
              onClick={() => handleModeSwitch("sentence")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
                text-sm font-medium transition-all ${
                mode === "sentence"
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-gray-400 hover:text-white"}`}
            >
              <MessageSquare className="w-4 h-4" />Sentence Mode
            </button>
          </div>

          <div className="relative rounded-2xl border border-white/10 bg-black/40 overflow-hidden aspect-video">
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
                  isRecording
                    ? mode === "sentence" ? "bg-orange-500/90" : "bg-red-500/90"
                    : "bg-white/10"}`}>
                  <span className={`w-2 h-2 rounded-full ${
                    isRecording ? "bg-white animate-pulse" : "bg-green-400"}`} />
                  {isRecording
                    ? mode === "sentence" ? "REC SENTENCE" : "REC SIGN"
                    : "READY"}
                </div>

                {/* Recording progress bar */}
                {isRecording && (
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
                    <div
                      className={`h-full transition-all duration-200 ${
                        mode === "sentence" ? "bg-orange-500" : "bg-primary"}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}

                {isProcessing && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-2
                                  bg-black/60 rounded-full px-3 py-1 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />Processing…
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
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold
                transition-all ${cameraOn
                  ? "bg-red-600 hover:bg-red-700"
                  : "flex-1 bg-primary hover:bg-primary/90"}`}
            >
              {cameraOn
                ? <><CameraOff className="w-5 h-5" />Stop</>
                : <><Camera   className="w-5 h-5" />Start Camera</>}
            </button>

            {/* Record / Done button — shown for BOTH modes */}
            {cameraOn && !isProcessing && (
              isRecording ? (
                <button
                  onClick={sendRecording}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                    font-semibold transition-all ${
                    mode === "sentence"
                      ? "bg-orange-600 hover:bg-orange-700"
                      : "bg-primary hover:bg-primary/90"}`}
                >
                  <Square className="w-4 h-4" />
                  Done ({remainingSec}s)
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                    font-semibold bg-green-600 hover:bg-green-700 transition-all"
                >
                  <Circle className="w-4 h-4" />Record {mode === "word" ? "Sign" : "Sentence"}
                </button>
              )
            )}

            <div className="relative">
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 rounded-xl
                           px-4 py-3 pr-8 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
              <Languages className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Status / error */}
          <div className={`rounded-xl px-4 py-2 text-sm border ${
            error
              ? "bg-red-900/40 border border-red-700 text-red-300"
              : "bg-white/5 border-white/10 text-gray-400"}`}>
            {error
              ? <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</span>
              : status}
          </div>
        </div>

        {/* ── Translation panel ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 min-h-[12rem] flex flex-col">
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
                <div>
                  <p className="text-2xl font-medium leading-relaxed text-white">{translation}</p>
                  {/* Translated text in selected language */}
                  {translatedText && language !== "en" && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {LANGUAGES.find(l => l.code === language)?.label || language}
                      </p>
                      <p className="text-xl font-medium text-primary">{translatedText}</p>
                    </div>
                  )}
                  {isTranslating && language !== "en" && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <Loader2 className="w-3 h-3 animate-spin" />Translating…
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600 italic text-sm mt-4">
                  {!cameraOn
                    ? "Start the camera and begin signing"
                    : mode === "word"
                      ? "Press Record, perform a sign, then press Done"
                      : "Press Record, sign words with brief pauses, then press Done"}
                </p>
              )}
            </div>

            {/* Detected words (sentence mode) */}
            {mode === "sentence" && sentenceWords.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10">
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
              <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                <button onClick={speakText}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors">
                  <Volume2 className="w-4 h-4" />Speak
                </button>
                <button onClick={copyText}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors">
                  <Copy className="w-4 h-4" />Copy
                </button>
                <button onClick={() => { setTranslation(""); setTranslatedText(""); setConfidence(null); setSentenceWords([]); }}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-400 transition-colors ml-auto">
                  <RefreshCw className="w-4 h-4" />Clear
                </button>
              </div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i}
                    onClick={() => { setTranslation(h); translateText(h); }}
                    className="text-sm text-gray-300 hover:text-white px-3 py-2
                               bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors border border-white/5">
                    {h}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="rounded-xl border border-primary/25 bg-primary/10 p-4 text-sm text-gray-200">
            <p className="font-semibold mb-1 text-primary">
              {mode === "word" ? "Tips for Word Mode" : "Tips for Sentence Mode"}
            </p>
            {mode === "word" ? (
              <ul className="text-gray-400 space-y-1 text-xs list-disc list-inside">
                <li>Press Record, then perform the sign clearly.</li>
                <li>Press Done when finished (it will automatically stop after 5 seconds).</li>
                <li>Ensure good lighting on your hands (avoid backlighting).</li>
                <li>Keep your full arm visible in the frame.</li>
                <li>Make sure your hands are clearly separated from the background.</li>
              </ul>
            ) : (
              <ul className="text-gray-400 space-y-1 text-xs list-disc list-inside">
                <li>Press Record, then sign clearly and in order.</li>
                <li>Pause briefly (about half a second) between each sign.</li>
                <li>Press Done when finished (it will automatically stop after 20 seconds).</li>
                <li>Make sure the lighting is good and your hands are clearly visible.</li>
                <li>Keep your hands clearly separated from the background.</li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
