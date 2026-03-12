import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Hand, ArrowLeft, Camera, CameraOff, Volume2, Copy,
  RefreshCw, Settings, Maximize2, Languages,
} from "lucide-react";

const SignToText = () => {
  const [cameraOn, setCameraOn] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [language, setLanguage] = useState("en");

  const mockTranslations = [
    "Hello, how are you?",
    "My name is Alex.",
    "Nice to meet you!",
    "Thank you very much.",
    "Can you help me please?",
  ];

  const handleToggleCamera = () => {
    setCameraOn(!cameraOn);
    if (!cameraOn) {
      let i = 0;
      const interval = setInterval(() => {
        setTranslatedText(mockTranslations[i % mockTranslations.length]);
        i++;
        if (i >= mockTranslations.length) clearInterval(interval);
      }, 2000);
    } else {
      setTranslatedText("");
    }
  };

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
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Camera Feed */}
          <div className="animate-fade-up">
            <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden">
              <div className="aspect-video bg-secondary/30 relative flex items-center justify-center">
                {cameraOn ? (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20" />
                    {/* Simulated camera overlay */}
                    <div className="relative w-full h-full flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-primary/40 rounded-2xl animate-pulse" />
                      <div className="absolute top-4 left-4 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs text-foreground font-mono">LIVE</span>
                      </div>
                      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground font-mono">
                        MediaPipe · 30fps · Tracking
                      </div>
                    </div>
                  </>
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
                {translatedText ? (
                  <p className="text-2xl font-semibold text-foreground text-center animate-fade-up leading-relaxed">
                    "{translatedText}"
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm text-center">
                    Translated text will appear here...
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="p-4 border-t border-border flex items-center justify-center gap-3">
                <button className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 flex items-center gap-2 transition-all">
                  <Copy className="w-4 h-4" /> Copy
                </button>
                <button className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 flex items-center gap-2 transition-all">
                  <Volume2 className="w-4 h-4" /> Speak
                </button>
                <button className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 flex items-center gap-2 transition-all">
                  <RefreshCw className="w-4 h-4" /> Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Info bar */}
        <div className="mt-6 rounded-xl border border-border bg-card/60 p-4 flex flex-wrap items-center justify-between gap-4 animate-fade-up" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>Model: <span className="text-foreground font-medium">3D CNN + Transformer</span></span>
            <span>NLP: <span className="text-foreground font-medium">BERT Refinement</span></span>
            <span>Landmarks: <span className="text-foreground font-medium">MediaPipe Holistic</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">System Ready</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignToText;
