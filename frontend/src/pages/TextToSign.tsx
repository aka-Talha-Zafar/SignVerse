import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Type, Play, Pause, RotateCcw,
  SkipForward, SkipBack, User as UserIcon, Loader2, AlertCircle,
} from "lucide-react";

// Update this to your Hugging Face Space URL
const API_BASE = import.meta.env.VITE_API_URL || "https://your-huggingface-space-url.hf.space";

export default function TextToSign() {
  const [inputText,    setInputText]    = useState("");
  const [frames,       setFrames]       = useState<any[]>([]);
  const [isLoading,    setIsLoading]    = useState(false);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [error,        setError]        = useState("");
  const [statusMsg,    setStatusMsg]    = useState("");
  const [fpsRate,      setFpsRate]      = useState(20);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLooping,    setIsLooping]    = useState(true);

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Animation engine state
  const engine = useRef({
    anim: [] as any[],
    fi: 0,
    lastTime: 0,
    accumulator: 0
  });

  const isMissing = (pt: number[]) => Math.abs(pt[0]) < 0.001 && Math.abs(pt[1]) < 0.001;

  // ── Draw the Pro Mannequin Frame ────────────────────────────────────────
  const drawFrame = useCallback((frame: any, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width; const H = canvas.height;

    // Background
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0f0f1a";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(139,92,246,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(i * W / 10, 0); ctx.lineTo(i * W / 10, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * H / 10); ctx.lineTo(W, i * H / 10); ctx.stroke();
    }

    // 🚨 FIX: Safely assign the frame. If null, use the resting pose array.
    const currentFrame = frame || Array.from({ length: 75 }, (_, i) => {
      if (i === 11) return [-0.15, 0]; // Resting Left Shoulder
      if (i === 12) return [0.15, 0];  // Resting Right Shoulder
      return [0, 0]; // Hide everything else
    });

    // Responsive Sizing
    const CX = W * 0.50; 
    const CY = H * 0.35; 
    const SCALE = Math.min(W, H) * 0.85; 
    
    const B = (kp: number[]) => ({ x: CX + kp[0]*SCALE, y: CY + kp[1]*SCALE });

    // Safely use currentFrame for all measurements
    const lSh = B(currentFrame[11]), rSh = B(currentFrame[12]);
    const headCX = (lSh.x + rSh.x) / 2;
    const headCY = ((lSh.y + rSh.y) / 2) - (SCALE * 0.16); 

    // --- MANNEQUIN HEAD ---
    ctx.beginPath(); ctx.moveTo(headCX, headCY + 40); ctx.lineTo(headCX, headCY + 60);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 14; ctx.stroke();

    ctx.beginPath(); ctx.arc(headCX, headCY - 5, 45, Math.PI, 2*Math.PI);
    ctx.fillStyle = '#0F172A'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(headCX - 42, headCY - 8); ctx.lineTo(headCX - 48, headCY + 15); ctx.lineTo(headCX - 20, headCY - 5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(headCX + 42, headCY - 8); ctx.lineTo(headCX + 48, headCY + 15); ctx.lineTo(headCX + 20, headCY - 5); ctx.fill();

    ctx.beginPath(); ctx.arc(headCX, headCY, 42, 0, Math.PI*2);
    ctx.fillStyle = '#E2E8F0'; ctx.fill(); 
    ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 3; ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.ellipse(headCX - 15, headCY - 3, 6, 8, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(headCX + 15, headCY - 3, 6, 8, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(headCX - 16, headCY - 5, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(headCX + 14, headCY - 5, 2, 0, Math.PI*2); ctx.fill();

    ctx.beginPath(); ctx.moveTo(headCX, headCY + 4); ctx.lineTo(headCX - 4, headCY + 14); ctx.lineTo(headCX, headCY + 14);
    ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 2; ctx.stroke();

    ctx.beginPath(); ctx.arc(headCX, headCY + 22, 10, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = '#E07A5F'; ctx.lineWidth = 3; ctx.stroke();

    // --- GHOSTED TORSO ---
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const lines = [ [11, 12], [11, 23], [12, 24], [23, 24], [11, 13], [13, 15], [12, 14], [14, 16] ];
    lines.forEach(([s, e]) => { 
        if(isMissing(currentFrame[s]) || isMissing(currentFrame[e])) return;
        ctx.beginPath(); ctx.moveTo(B(currentFrame[s]).x, B(currentFrame[s]).y); ctx.lineTo(B(currentFrame[e]).x, B(currentFrame[e]).y); ctx.stroke(); 
    });

    // --- HANDS ---
    const fingers = [ [0,1,2,3,4], [0,5,6,7,8], [0,9,10,11,12], [0,13,14,15,16], [0,17,18,19,20] ];
    const handColor = '#FBBF24'; const armColor = 'rgba(148, 163, 184, 0.8)';

    [ {offset: 33, wrist: 15}, {offset: 54, wrist: 16} ].forEach(hand => {
      if (isMissing(currentFrame[hand.offset]) || isMissing(currentFrame[hand.wrist])) return; 
      
      const wristPx = B(currentFrame[hand.wrist]); const handBasePx = B(currentFrame[hand.offset]);
      const dx = wristPx.x - handBasePx.x; const dy = wristPx.y - handBasePx.y;
      const glued = (index: number) => { const pt = B(currentFrame[index]); return { x: pt.x + dx, y: pt.y + dy }; };

      ctx.beginPath(); ctx.moveTo(wristPx.x, wristPx.y); ctx.lineTo(glued(hand.offset).x, glued(hand.offset).y);
      ctx.strokeStyle = armColor; ctx.lineWidth = 6; ctx.stroke();
      
      ctx.strokeStyle = handColor; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      fingers.forEach((finger) => {
        ctx.beginPath(); ctx.moveTo(glued(hand.offset).x, glued(hand.offset).y); 
        for(let j=1; j<finger.length; j++) { 
            if(isMissing(currentFrame[hand.offset + finger[j]])) continue; 
            ctx.lineTo(glued(hand.offset + finger[j]).x, glued(hand.offset + finger[j]).y); 
        }
        ctx.stroke();
      });
    });
  }, []);

  // ── Render Loop ─────────────────────────────────────────────────────────
  const renderLoop = useCallback((time: number) => {
    let en = engine.current;
    if (!en.lastTime) en.lastTime = time;
    let dt = time - en.lastTime; en.lastTime = time;

    if (isPlaying && en.anim.length > 0) {
        en.accumulator += dt;
        let frameDuration = 1000 / (fpsRate * playbackSpeed);
        while (en.accumulator >= frameDuration) {
            en.accumulator -= frameDuration; en.fi++;
            if (en.fi >= en.anim.length) {
                if (isLooping) { en.fi = 0; } 
                else { en.fi = en.anim.length - 1; setIsPlaying(false); }
            }
        }
        setCurrentFrame(en.fi);
    }

    if (canvasRef.current) {
        drawFrame(en.anim.length > 0 ? en.anim[en.fi] : null, canvasRef.current);
    }
    requestRef.current = requestAnimationFrame(renderLoop);
  }, [isPlaying, isLooping, playbackSpeed, fpsRate, drawFrame]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(renderLoop);
    return () => { if(requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [renderLoop]);

  // ── Translate text (API Call to Hugging Face) ──────────────────────────
  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setError(""); setStatusMsg(""); setIsLoading(true); setIsPlaying(false);

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

      setStatusMsg(`ASL Gloss: ${data.gloss}`);
      setFrames(data.frames);
      setFpsRate(data.fps || 20);
      
      engine.current.anim = data.frames;
      engine.current.fi = 0;
      setCurrentFrame(0);
      setIsPlaying(true);

    } catch (e: any) {
      setError(e.message);
      engine.current.anim = [];
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay  = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => { engine.current.fi = 0; setCurrentFrame(0); setIsPlaying(true); };

  const handlePrev = () => {
    setIsPlaying(false);
    if(engine.current.anim.length > 0) {
      engine.current.fi = Math.max(0, engine.current.fi - 1);
      setCurrentFrame(engine.current.fi);
    }
  };
  const handleNext = () => {
    setIsPlaying(false);
    if(engine.current.anim.length > 0) {
      engine.current.fi = Math.min(engine.current.anim.length - 1, engine.current.fi + 1);
      setCurrentFrame(engine.current.fi);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
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
          </div>

          <button
            onClick={handleTranslate}
            disabled={isLoading || !inputText.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                       disabled:cursor-not-allowed rounded-xl font-semibold flex items-center
                       justify-center gap-2 transition-all"
          >
            {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" />Translating…</> : <><Type className="w-5 h-5" />Translate to Sign</>}
          </button>

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}
          {statusMsg && (
            <div className="bg-indigo-900/20 border border-indigo-800/40 rounded-xl p-4 text-sm text-indigo-300">
              <p className="font-semibold">✅ {statusMsg}</p>
            </div>
          )}
        </div>

        {/* Avatar panel */}
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
            <canvas ref={canvasRef} width={600} height={600} className="w-full aspect-square" style={{ background: "#0f0f1a" }} />
          </div>

          {/* Playback controls */}
          {frames.length > 0 && (
            <div className="bg-gray-900 rounded-2xl p-4 space-y-3 border border-gray-800">
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: frames.length ? `${(currentFrame / (frames.length - 1)) * 100}%` : "0%" }} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Frame {currentFrame + 1}</span>
                <span>{frames.length} total</span>
              </div>

              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button onClick={handlePrev} className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"><SkipBack className="w-5 h-5" /></button>
                <button onClick={handleReset} className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"><RotateCcw className="w-5 h-5" /></button>
                <button onClick={isPlaying ? handlePause : handlePlay} className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 transition-all">
                  {isPlaying ? <><Pause className="w-5 h-5" />Pause</> : <><Play className="w-5 h-5" />Play</>}
                </button>
                <button onClick={handleNext} className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"><SkipForward className="w-5 h-5" /></button>
                
                <button onClick={() => setIsLooping(!isLooping)} className={`ml-4 px-4 py-2 text-xs font-bold rounded-xl transition-all ${isLooping ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    🔁 Loop {isLooping ? '' : 'Off'}
                </button>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 ml-2">
                    <label>{playbackSpeed.toFixed(2)}x</label>
                    <input type="range" min="0.25" max="2" step="0.25" value={playbackSpeed} onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))} className="w-20 accent-indigo-500" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}