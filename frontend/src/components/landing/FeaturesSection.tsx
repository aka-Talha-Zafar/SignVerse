import { useScrollAnimate } from "@/hooks/useScrollAnimate";
import { Camera, Type, GraduationCap } from "lucide-react";
import { useRef } from "react";

const features = [
  {
    icon: Camera,
    title: "Sign-to-Text / Speech",
    description:
      "Your webcam captures ASL signs in real-time. Our backend classifies signs and returns English text; the app refines display (NSOR) and can speak or translate to other languages.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconGlow: "shadow-blue-500/20",
  },
  {
    icon: Type,
    title: "Text-to-Sign",
    description:
      "Type any English text and watch an animated 2D skeleton avatar perform the corresponding ASL signs with fluid, natural motion.",
    gradient: "from-violet-500/20 to-purple-500/20",
    iconGlow: "shadow-violet-500/20",
  },
  {
    icon: GraduationCap,
    title: "Interactive Learning",
    description:
      "Learn and practice ASL signs with real-time feedback, progress tracking, quizzes, and a structured curriculum for all skill levels.",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconGlow: "shadow-emerald-500/20",
  },
];

const FeaturesSection = () => {
  const containerRef = useScrollAnimate();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="section-divider mb-24" />
      <div ref={containerRef} className="max-w-6xl mx-auto px-6">
        <div className="scroll-animate text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Core Features</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            <span className="heading-underline">One Platform, Complete Communication</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
          {features.map((f) => (
            <div
              key={f.title}
              onMouseMove={handleMouseMove}
              className="scroll-animate group relative p-8 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all duration-500 hover:scale-[1.03] glow-card overflow-hidden"
            >
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-xl ${f.iconGlow} transition-all duration-500`}
              >
                <f.icon className="w-7 h-7 text-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              {/* Shimmer line at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
