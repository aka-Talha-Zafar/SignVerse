import { useScrollAnimate } from "@/hooks/useScrollAnimate";
import { Video, Cpu, Brain, MessageSquare } from "lucide-react";

const steps = [
  {
    icon: Video,
    title: "Capture",
    description: "Webcam captures hand gestures and body pose in real-time using MediaPipe.",
  },
  {
    icon: Cpu,
    title: "AI Processing",
    description: "3D CNN + Transformer models analyze spatial-temporal sign patterns with high accuracy.",
  },
  {
    icon: Brain,
    title: "NLP Refinement",
    description: "BERT-based models convert ASL gloss sequences into grammatically correct English sentences.",
  },
  {
    icon: MessageSquare,
    title: "Output",
    description: "Results delivered as readable text, synthesized speech, or animated sign language avatar.",
  },
];

const HowItWorksSection = () => {
  const containerRef = useScrollAnimate();

  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 bg-card/30">
      <div ref={containerRef} className="max-w-6xl mx-auto px-6">
        <div className="scroll-animate text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">How It Works</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            <span className="heading-underline">From Gesture to Language in Milliseconds</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 stagger-children relative">
          {steps.map((step, i) => (
            <div key={step.title} className="scroll-animate relative">
              <div className="group flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-500 hover:scale-[1.03] hover:shadow-lg hover:shadow-primary/5">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 relative group-hover:bg-primary/15 transition-all duration-300">
                  <step.icon className="w-7 h-7 text-primary transition-transform duration-300 group-hover:scale-110" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg shadow-primary/30">
                    {i + 1}
                  </span>
                  {/* Pulse ring on hover */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary/0 group-hover:border-primary/20 group-hover:scale-125 transition-all duration-700 opacity-0 group-hover:opacity-100" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
              {/* Animated connector */}
              {i < steps.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-10 items-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12h14m-7-7l7 7-7 7"
                      stroke="hsl(217 91% 60%)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="line-draw"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
