import FloatingOrbs from "./FloatingOrbs";
import { Link } from "react-router-dom";

const HeroSection = () => (
  <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
    <FloatingOrbs />
    {/* Subtle grid overlay */}
    <div
      className="absolute inset-0 opacity-[0.03] pointer-events-none"
      style={{
        backgroundImage: `linear-gradient(hsl(217 91% 60% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(217 91% 60% / 0.3) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }}
    />
    {/* Radial center glow */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

    <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
      {/* Badge */}
      <div
        className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mt-4 mb-8 animate-glow-breathe"
        style={{ animationDelay: "0.1s", animationFillMode: "both" }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        AI-Powered ASL Translation System
      </div>

      <h1
        className="animate-fade-up text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight mb-6"
        style={{ animationDelay: "0.2s", animationFillMode: "both" }}
      >
        Breaking the{" "}
        <span className="text-gradient-animated">Communication Barrier</span>
        <br />
        Between Deaf &amp; Hearing Communities
      </h1>
      <p
        className="animate-fade-up text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
        style={{ animationDelay: "0.4s", animationFillMode: "both" }}
      >
        A bidirectional ASL translation system that converts sign language to text/speech
        and text to sign — powered by AI, built for everyone.
      </p>
      <div
        className="animate-fade-up flex flex-col sm:flex-row gap-4 justify-center"
        style={{ animationDelay: "0.6s", animationFillMode: "both" }}
      >
        <Link to="/login" className="group px-8 py-3.5 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:shadow-xl hover:scale-105 relative overflow-hidden inline-block">
          <span className="relative z-10">Try SignVerse</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </Link>
        <Link to="/learn-more" className="px-8 py-3.5 rounded-xl font-semibold border border-border text-foreground hover:bg-secondary transition-all duration-300 hover:scale-105 hover:border-primary/30">
          Learn More
        </Link>
      </div>

      {/* Scroll indicator */}
      <div
        className="animate-fade-up mt-16"
        style={{ animationDelay: "1s", animationFillMode: "both" }}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-5 h-8 rounded-full border border-muted-foreground/30 flex items-start justify-center p-1">
            <div className="w-1 h-2 rounded-full bg-primary animate-bounce" />
          </div>
        </div>
      </div>
    </div>
    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
  </section>
);

export default HeroSection;
