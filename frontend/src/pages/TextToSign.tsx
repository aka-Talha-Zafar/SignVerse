import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Type, Play, Pause, RotateCcw,
  SkipForward, SkipBack, User as UserIcon, AlertCircle, Loader2
} from "lucide-react";

// ─── OFFLINE ASL PARSER & ANIMATION ENGINE ─────────────────────────────────
const AUX = new Set(['is','are','was','were','am','be','do','does','did','has','have','will','can']);

function toASL(s: string) {
  if (!s) return '';
  s = s.trim().toLowerCase().replace("don't", "do not").replace("doesn't", "does not");
  let t = (s.match(/[a-z]+/g) || []).filter(x => x !== 'not' && !['a','an','the','to','of','in','at','on','for','with','by','from'].includes(x));
  if (!t.length) return '';
  if (['what','where','when','who','why','how'].includes(t[0])) { 
      t = [t[0]].concat(t.slice(1).filter(x => !AUX.has(x))); 
  } else { 
      t = t.filter(x => !AUX.has(x)); 
  }
  let tm = t.filter(x => ['yesterday','today','tomorrow','now'].includes(x));
  t = tm.concat(t.filter(x => !['yesterday','today','tomorrow','now'].includes(x)));
  if (s.includes('not')) t.push('not');
  return t.join(' ').toUpperCase();
}

function isMissing(pt: number[]) { 
  return Math.abs(pt[0]) < 0.001 && Math.abs(pt[1]) < 0.001; 
}

function buildAnim(tokens: string[]) {
  // @ts-ignore - Accessing global window object
  const WORDS = window.WORDS_DB || window.INJECTED_DB;
  if (!WORDS) return null;

  let seq: any[] = []; let TF = 5; let clips: any[] = []; 
  
  for(let t of tokens) { 
      let realKey = Object.keys(WORDS).find(k => k.trim().toUpperCase() === t);
      if(realKey) clips.push(WORDS[realKey]); 
  }
  
  if(clips.length === 0) return null;
  for(let f of clips[0]) seq.push(f);
  
  for(let i=1; i<clips.length; i++) {
    let c1 = clips[i-1][clips[i-1].length-1], c2 = clips[i][0];

    for(let t=1; t<=TF; t++) {
       let a = t / (TF + 1); let x = a < 0.5 ? 2 * a * a : 1 - Math.pow(-2 * a + 2, 2) / 2;
       let transFrame = [];
       for(let kp=0; kp<75; kp++) {
          if (isMissing(c1[kp]) || isMissing(c2[kp])) { transFrame.push([0, 0]); }
          else { transFrame.push([ c1[kp][0]*(1-x) + c2[kp][0]*x, c1[kp][1]*(1-x) + c2[kp][1]*x ]); }
       }
       seq.push(transFrame);
    }
    for(let f of clips[i]) seq.push(f);
  }
  return seq;
}

// ─── MAIN REACT COMPONENT ──────────────────────────────────────────────────
export default function TextToSign() {
  const [inputText, setInputText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [statusMsg, setStatusMsg] = useState("Checking database...");
  const [hasResult, setHasResult] = useState(false);
  const [error, setError] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Animation Engine State
  const engine = useRef({
    anim: null as any[] | null,
    fi: 0,
    lastTime: 0,
    accumulator: 0,
    BASE_FPS: 20
  });

  // ─── DRAW PRO MANNEQUIN (Responsive Size) ────────────────────────────────
  const drawSkeleton = useCallback((frame: any, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const W = canvas.width; const H = canvas.height;

    // 1. Draw Tech Background
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0f0f1a";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(139,92,246,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(i * W / 10, 0); ctx.lineTo(i * W / 10, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * H / 10); ctx.lineTo(W, i * H / 10); ctx.stroke();
    }

    if (!frame) return;

    // 2. Responsive Sizing Math (Guarantees avatar never goes out of frame)
    const CX = W * 0.50; 
    const CY = H * 0.35; 
    const SCALE = Math.min(W, H) * 0.85; // Perfectly scales to fit the box
    
    const B = (kp: number[]) => ({ x: CX + kp[0]*SCALE, y: CY + kp[1]*SCALE });

    const lSh = B(frame[11]), rSh = B(frame[12]);
    const headCX = (lSh.x + rSh.x) / 2;
    const headCY = ((lSh.y + rSh.y) / 2) - (SCALE * 0.16); // Dynamic Neck

    // --- PROFESSIONAL MANNEQUIN HEAD ---
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
        if(isMissing(frame[s]) || isMissing(frame[e])) return;
        ctx.beginPath(); ctx.moveTo(B(frame[s]).x, B(frame[s]).y); ctx.lineTo(B(frame[e]).x, B(frame[e]).y); ctx.stroke(); 
    });

    // --- HANDS (Glue Fix & Missing Safeties) ---
    const fingers = [ [0,1,2,3,4], [0,5,6,7,8], [0,9,10,11,12], [0,13,14,15,16], [0,17,18,19,20] ];
    const handColor = '#FBBF24'; 
    const armColor = 'rgba(148, 163, 184, 0.8)';

    [ {offset: 33, wrist: 15}, {offset: 54, wrist: 16} ].forEach(hand => {
      if (isMissing(frame[hand.offset]) || isMissing(frame[hand.wrist])) return; 
      
      const wristPx = B(frame[hand.wrist]);
      const handBasePx = B(frame[hand.offset]);
      const dx = wristPx.x - handBasePx.x;
      const dy = wristPx.y - handBasePx.y;

      const glued = (index: number) => {
          const pt = B(frame[index]);
          return { x: pt.x + dx, y: pt.y + dy };
      };

      // Draw Wrist to Hand
      ctx.beginPath(); ctx.moveTo(wristPx.x, wristPx.y); ctx.lineTo(glued(hand.offset).x, glued(hand.offset).y);
      ctx.strokeStyle = armColor; ctx.lineWidth = 6; ctx.stroke();
      
      // Draw Fingers
      ctx.strokeStyle = handColor; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      fingers.forEach((finger) => {
        ctx.beginPath(); ctx.moveTo(glued(hand.offset).x, glued(hand.offset).y); 
        for(let j=1; j<finger.length; j++) { 
            if(isMissing(frame[hand.offset + finger[j]])) continue; 
            ctx.lineTo(glued(hand.offset + finger[j]).x, glued(hand.offset + finger[j]).y); 
        }
        ctx.stroke();
      });
    });
  }, []);

  // ─── RENDER LOOP ─────────────────────────────────────────────────────────
  const renderLoop = useCallback((time: number) => {
    let en = engine.current;
    if (!en.lastTime) en.lastTime = time;
    let dt = time - en.lastTime; en.lastTime = time;

    if (isPlaying && en.anim && en.anim.length > 0) {
        en.accumulator += dt;
        let frameDuration = 1000 / (en.BASE_FPS * playbackSpeed);
        while (en.accumulator >= frameDuration) {
            en.accumulator -= frameDuration; en.fi++;
            if (en.fi >= en.anim.length) {
                if (isLooping) { en.fi = 0; } 
                else { en.fi = en.anim.length - 1; setIsPlaying(false); }
            }
        }
        
        // Sync React UI Progress Bar (Throttled via frame index change)
        setCurrentFrame(en.fi);
    }

    if (canvasRef.current && en.anim) {
        drawSkeleton(en.anim[en.fi], canvasRef.current);
    } else if (canvasRef.current && !en.anim) {
        // Draw empty tech background
        drawSkeleton(null, canvasRef.current);
    }

    requestRef.current = requestAnimationFrame(renderLoop);
  }, [isPlaying, isLooping, playbackSpeed, drawSkeleton]);

  // ─── INITIALIZATION ──────────────────────────────────────────────────────
  useEffect(() => {
    // Check for offline database
    // @ts-ignore
    if (window.WORDS_DB) { setStatusMsg("Ready. Database loaded."); } 
    else {
      const checkDB = setInterval(() => {
        // @ts-ignore
        if (window.WORDS_DB) { setStatusMsg("Ready. Database loaded."); clearInterval(checkDB); }
      }, 500);
    }
    
    requestRef.current = requestAnimationFrame(renderLoop);
    return () => { if(requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [renderLoop]);

  // ─── ACTIONS ─────────────────────────────────────────────────────────────
  const handleTranslate = () => {
    // @ts-ignore
    if (!window.WORDS_DB) { setError("Please wait for database to load."); return; }
    if (!inputText.trim()) return;
    setError("");
    
    let gloss = toASL(inputText);
    let sequence = buildAnim(gloss.split(' ').filter(x => x));
    
    if(sequence) { 
        setStatusMsg("ASL Gloss: " + gloss);
        engine.current.anim = sequence; 
        engine.current.fi = 0;
        setTotalFrames(sequence.length);
        setCurrentFrame(0);
        setHasResult(true);
        setIsPlaying(true);
    } else { 
        setError("Missing vocabulary for: " + inputText); 
        setHasResult(false);
        setIsPlaying(false);
        engine.current.anim = null;
    }
  };

  const handlePlay  = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => { engine.current.fi = 0; setCurrentFrame(0); setIsPlaying(true); };

  const handlePrev = () => {
    setIsPlaying(false);
    if(engine.current.anim) {
      engine.current.fi = Math.max(0, engine.current.fi - 1);
      setCurrentFrame(engine.current.fi);
    }
  };
  const handleNext = () => {
    setIsPlaying(false);
    if(engine.current.anim) {
      engine.current.fi = Math.min(engine.current.anim.length - 1, engine.current.fi + 1);
      setCurrentFrame(engine.current.fi);
    }
  };

  // ─── JSX UI ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <UserIcon className="w-6 h-6 text-indigo-400" />
        <h1 className="text-xl font-bold">Text to Sign</h1>
      </header>

      <div className="max-w-6xl mx-auto p-6 grid lg:grid-cols-2 gap-6">
        {/* INPUT PANEL */}
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
            <p className="text-xs text-gray-600 mt-1">Ctrl+Enter to translate</p>
          </div>

          <button
            onClick={handleTranslate}
            disabled={!inputText.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                       disabled:cursor-not-allowed rounded-xl font-semibold flex items-center
                       justify-center gap-2 transition-all"
          >
            <Type className="w-5 h-5" />Translate to Sign
          </button>

          {/* Status & Error Messages */}
          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          
          <div className="bg-indigo-900/20 border border-indigo-800/40 rounded-xl p-4 text-sm text-indigo-300">
            <p className="font-semibold mb-1">Status: {statusMsg}</p>
            <p className="text-indigo-400 text-xs leading-relaxed mt-2">
              The avatar is running locally offline. Sign accuracy improves with shorter, common phrases.
            </p>
          </div>
        </div>

        {/* AVATAR PANEL */}
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
            <canvas
              ref={canvasRef}
              width={600}
              height={600}
              className="w-full aspect-square"
              style={{ background: "#0f0f1a" }}
            />
          </div>

          {/* Playback Controls */}
          {hasResult && (
            <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
              {/* Progress bar */}
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all"
                  style={{ width: totalFrames ? `${(currentFrame / (totalFrames - 1)) * 100}%` : "0%" }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Frame {currentFrame + 1}</span>
                <span>{totalFrames} total</span>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button onClick={handlePrev} className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all">
                  <SkipBack className="w-5 h-5" />
                </button>
                <button onClick={handleReset} className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all">
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={isPlaying ? handlePause : handlePlay}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 transition-all"
                >
                  {isPlaying ? <><Pause className="w-5 h-5" />Pause</> : <><Play className="w-5 h-5" />Play</>}
                </button>
                <button onClick={handleNext} className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all">
                  <SkipForward className="w-5 h-5" />
                </button>
                
                {/* Custom Loop & Speed from Avatar App */}
                <button 
                    onClick={() => setIsLooping(!isLooping)} 
                    className={`ml-4 px-4 py-2 text-xs font-bold rounded-xl transition-all ${isLooping ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                >
                    🔁 Loop {isLooping ? '' : 'Off'}
                </button>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 ml-2">
                    <label>{playbackSpeed.toFixed(2)}x</label>
                    <input type="range" min="0.25" max="2" step="0.25" value={playbackSpeed} onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))} className="w-20 accent-indigo-500" />
                </div>
              </div>
            </div>
          )}

          {!hasResult && (
            <div className="bg-gray-900 rounded-2xl p-8 flex flex-col items-center gap-3 text-gray-600">
              <UserIcon className="w-16 h-16 opacity-20" />
              <p className="text-sm text-center">Type an English sentence and click "Translate to Sign" to watch the Pro Avatar perform.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}