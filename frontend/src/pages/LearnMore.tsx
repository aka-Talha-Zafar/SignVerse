import { Link } from "react-router-dom";
import { Hand, ArrowLeft, Camera, Type, GraduationCap, ArrowLeftRight, MessageSquareText, Layers, Ear, Users, BookOpen, CheckCircle2 } from "lucide-react";
import { useScrollAnimate } from "@/hooks/useScrollAnimate";

const LearnMore = () => {
  const containerRef = useScrollAnimate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-solid">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20">
              <Hand className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">
              Sign<span className="text-primary">Verse</span>
            </span>
          </Link>
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
            <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" /> Back to Home
          </Link>
        </div>
      </nav>

      <main ref={containerRef} className="pt-28 pb-20 max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="scroll-animate mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">About SignVerse</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-6">
            Everything You Need to Know About{" "}
            <span className="text-gradient-animated">SignVerse</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            SignVerse is a comprehensive bidirectional American Sign Language (ASL) translation and learning system.
            It bridges the communication gap between deaf and hearing communities using cutting-edge AI technology.
          </p>
        </div>

        {/* Mission */}
        <AnimatedSection title="Our Mission">
          <p className="text-muted-foreground leading-relaxed mb-4">
            Over 70 million deaf individuals worldwide face daily communication barriers. Most existing tools only offer one-way translation
            and recognize isolated words — far from natural conversation. SignVerse was created to solve this by providing:
          </p>
          <ul className="space-y-3">
            {[
              "Real-time bidirectional translation between ASL and English",
              "Full sentence recognition, not just isolated signs",
              "An integrated learning platform to teach ASL to hearing individuals",
              "Multi-lingual speech output for global accessibility",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 group">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-foreground text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </AnimatedSection>

        {/* Features Deep Dive */}
        <AnimatedSection title="Core Features — In Detail">
          <div className="space-y-6">
            <FeatureDetail
              icon={Camera}
              title="Sign-to-Text / Speech"
              details={[
                "Webcam captures ASL signs using MediaPipe for hand, face, and body pose tracking",
                "3D CNN + Transformer architecture processes spatial-temporal sign patterns",
                "BERT-based NLP converts ASL gloss to grammatically correct English",
                "Multi-lingual text-to-speech engine outputs natural audio in multiple languages",
                "Works in real-time with minimal latency for natural conversation flow",
              ]}
            />
            <FeatureDetail
              icon={Type}
              title="Text-to-Sign"
              details={[
                "Type or paste any English text into the input field",
                "NLP engine parses sentence structure and maps to ASL grammar",
                "Animated 2D skeleton avatar performs corresponding ASL signs",
                "Smooth, natural motion between signs for readability",
                "Adjustable playback speed for learning and comprehension",
              ]}
            />
            <FeatureDetail
              icon={GraduationCap}
              title="Interactive Learning Module"
              details={[
                "Structured curriculum from basic fingerspelling to complex sentences",
                "Real-time feedback on signing accuracy using webcam detection",
                "Progress tracking with performance analytics and streak counts",
                "Interactive quizzes and practice sessions for reinforcement",
                "Difficulty levels from beginner to advanced ASL fluency",
              ]}
            />
          </div>
        </AnimatedSection>

        {/* Technical Architecture */}
        <AnimatedSection title="Technical Architecture">
          <p className="text-muted-foreground leading-relaxed mb-6">
            SignVerse leverages a modern AI pipeline combining computer vision, deep learning, and natural language processing.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "MediaPipe", desc: "Real-time hand, face & pose landmark extraction — 33 body, 21 hand, 468 face landmarks" },
              { label: "3D CNN + Transformer", desc: "Spatial-temporal feature extraction and sequence modeling for sign recognition" },
              { label: "BERT / NLP", desc: "ASL gloss-to-English conversion with grammatical correction and context awareness" },
              { label: "PoseFormer", desc: "3D human pose estimation from 2D landmarks for accurate sign interpretation" },
              { label: "React.js", desc: "Modern, responsive frontend with real-time webcam integration and smooth animations" },
              { label: "Firebase", desc: "Authentication, real-time database, cloud storage, and serverless backend functions" },
              { label: "TensorFlow / PyTorch", desc: "Model training and inference for sign language recognition and generation" },
              { label: "OpenCV", desc: "Image preprocessing, frame capture, and computer vision utilities" },
            ].map((tech) => (
              <div key={tech.label} className="p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-all duration-300 hover:scale-[1.02]">
                <h4 className="font-semibold text-foreground text-sm mb-1.5">{tech.label}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{tech.desc}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>

        {/* Who It's For */}
        <AnimatedSection title="Who Is SignVerse For?">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Ear, title: "Deaf & Hard-of-Hearing", desc: "Express yourself freely — signs are translated to text and speech instantly." },
              { icon: Users, title: "Hearing Non-Signers", desc: "Communicate with deaf individuals naturally without knowing sign language." },
              { icon: BookOpen, title: "ASL Learners", desc: "Master ASL through interactive lessons with real-time feedback and progress tracking." },
            ].map((u) => (
              <div key={u.title} className="p-6 rounded-xl bg-card border border-border text-center hover:border-primary/20 transition-all duration-300 hover:scale-[1.02] group">
                <u.icon className="w-8 h-8 text-primary mx-auto mb-3 transition-transform duration-300 group-hover:scale-110" />
                <h4 className="font-semibold text-foreground text-sm mb-2">{u.title}</h4>
                <p className="text-xs text-muted-foreground">{u.desc}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>

        {/* Competitive Advantages */}
        <AnimatedSection title="What Sets Us Apart">
          <div className="space-y-4">
            {[
              { icon: ArrowLeftRight, title: "Bidirectional", desc: "Both Sign→Text and Text→Sign in a single platform — most competitors only do one." },
              { icon: MessageSquareText, title: "Full Sentences", desc: "Recognizes complete sentences with grammar correction, not just isolated words." },
              { icon: Layers, title: "All-in-One", desc: "Translation and learning combined — no need for separate apps." },
            ].map((d) => (
              <div key={d.title} className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-all duration-300 group hover:scale-[1.01]">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <d.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm mb-1">{d.title}</h4>
                  <p className="text-xs text-muted-foreground">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>

        {/* Team */}
        <AnimatedSection title="The Team">
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            SignVerse is a Final Year Project developed at <span className="text-foreground font-medium">Lahore Garrison University</span>, supervised by <span className="text-foreground font-medium">M. Mugees Asif</span>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: "Uzair Moazzam", role: "Developer — AI/ML Pipeline & Backend" },
              { name: "Talha Zafar", role: "Developer — Frontend & System Integration" },
            ].map((m) => (
              <div key={m.name} className="flex items-center gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-all duration-300 group hover:scale-[1.02]">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm group-hover:bg-primary/20 transition-colors">
                  {m.name[0]}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{m.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>

        {/* CTA */}
        <div className="scroll-animate mt-16 text-center p-10 rounded-2xl bg-card border border-border glow-border animate-glow-breathe">
          <h2 className="text-2xl font-bold text-foreground mb-3">Ready to Try SignVerse?</h2>
          <p className="text-muted-foreground text-sm mb-6">Experience bidirectional ASL translation powered by AI.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login" className="group px-8 py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 relative overflow-hidden inline-block">
              <span className="relative z-10">Try SignVerse</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Link>
            <Link to="/" className="px-8 py-3 rounded-xl font-semibold border border-border text-foreground hover:bg-secondary transition-all duration-300 hover:scale-105">
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

function AnimatedSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-animate mb-16">
      <h2 className="text-2xl font-bold text-foreground mb-6 pb-3 border-b border-border">
        <span className="heading-underline">{title}</span>
      </h2>
      {children}
    </section>
  );
}

function FeatureDetail({ icon: Icon, title, details }: { icon: React.ElementType; title: string; details: string[] }) {
  return (
    <div className="p-6 rounded-xl bg-card border border-border hover:border-primary/20 transition-all duration-300 group">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
      </div>
      <ul className="space-y-2">
        {details.map((d, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
            <span className="text-sm text-muted-foreground">{d}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default LearnMore;
