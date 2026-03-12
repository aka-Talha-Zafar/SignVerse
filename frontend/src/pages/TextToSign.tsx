import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Type, Play, Pause, RotateCcw,
  Settings, SkipForward, SkipBack, User as UserIcon,
} from "lucide-react";

const TextToSign = () => {
  const [inputText, setInputText] = useState("");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const handlePlay = () => {
    if (!inputText.trim()) return;
    setPlaying(true);
    setTimeout(() => setPlaying(false), 4000);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass-solid">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Type className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold text-foreground">Text to Sign</h1>
            </div>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-5 animate-fade-up">
            <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6">
              <label className="text-sm font-medium text-foreground mb-3 block">Enter text to translate</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type an English sentence here..."
                rows={5}
                className="w-full bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground text-sm rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300"
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-muted-foreground">{inputText.length} characters</span>
                <button
                  onClick={handlePlay}
                  disabled={!inputText.trim() || playing}
                  className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center gap-2 hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 shimmer"
                >
                  <Play className="w-4 h-4" /> Translate
                </button>
              </div>
            </div>

            {/* Quick phrases */}
            <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-5">
              <h3 className="text-sm font-medium text-foreground mb-3">Quick Phrases</h3>
              <div className="flex flex-wrap gap-2">
                {["Hello", "Thank you", "My name is...", "How are you?", "Nice to meet you", "Please", "Sorry", "Goodbye"].map((phrase) => (
                  <button
                    key={phrase}
                    onClick={() => setInputText(phrase)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-secondary/30 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-300"
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Avatar Display */}
          <div className="animate-fade-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
            <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm h-full flex flex-col">
              <div className="aspect-square lg:aspect-auto lg:flex-1 bg-secondary/20 relative flex items-center justify-center min-h-[350px]">
                {/* Skeleton Avatar Placeholder */}
                <div className="relative">
                  <div className={`transition-all duration-500 ${playing ? "scale-105" : "scale-100"}`}>
                    {/* Simple stick figure / skeleton */}
                    <svg width="160" height="240" viewBox="0 0 160 240" className="text-primary">
                      {/* Head */}
                      <circle cx="80" cy="30" r="18" fill="none" stroke="currentColor" strokeWidth="2.5" className={playing ? "animate-pulse" : ""} />
                      {/* Body */}
                      <line x1="80" y1="48" x2="80" y2="140" stroke="currentColor" strokeWidth="2.5" />
                      {/* Arms */}
                      <line x1="80" y1="75" x2="30" y2={playing ? "95" : "110"} stroke="currentColor" strokeWidth="2.5" className="transition-all duration-700" />
                      <line x1="80" y1="75" x2="130" y2={playing ? "60" : "110"} stroke="currentColor" strokeWidth="2.5" className="transition-all duration-700" />
                      {/* Hands */}
                      <circle cx="30" cy={playing ? 95 : 110} r="5" fill="currentColor" className="transition-all duration-700 opacity-60" />
                      <circle cx="130" cy={playing ? 60 : 110} r="5" fill="currentColor" className="transition-all duration-700 opacity-60" />
                      {/* Legs */}
                      <line x1="80" y1="140" x2="50" y2="220" stroke="currentColor" strokeWidth="2.5" />
                      <line x1="80" y1="140" x2="110" y2="220" stroke="currentColor" strokeWidth="2.5" />
                      {/* Joints */}
                      {[{x:80,y:75},{x:80,y:140},{x:50,y:220},{x:110,y:220}].map((j, i) => (
                        <circle key={i} cx={j.x} cy={j.y} r="4" fill="currentColor" opacity="0.4" />
                      ))}
                    </svg>
                  </div>
                  {playing && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                      <span className="text-xs text-primary font-mono animate-pulse">Signing...</span>
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-card/80 border border-border rounded-lg px-3 py-1.5">
                  <UserIcon className="w-3 h-3 text-primary" />
                  <span className="text-xs text-muted-foreground">2D Skeleton Avatar</span>
                </div>
              </div>

              {/* Playback controls */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center justify-center gap-4">
                  <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPlaying(!playing)}
                    disabled={!inputText.trim()}
                    className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                    <SkipForward className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setPlaying(false); }}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className="text-xs text-muted-foreground">Speed:</span>
                  {[0.5, 1, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-2 py-0.5 rounded text-xs transition-all ${
                        speed === s
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TextToSign;
