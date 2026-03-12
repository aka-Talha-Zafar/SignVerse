import { useScrollAnimate } from "@/hooks/useScrollAnimate";
import { useEffect, useState, useRef } from "react";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 2000;
          const start = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="text-4xl sm:text-5xl font-extrabold text-gradient-animated">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

const stats = [
  { value: 70, suffix: "M+", label: "Deaf people worldwide" },
  { value: 95, suffix: "%", label: "Lack access to sign language education" },
  { value: 300, suffix: "+", label: "Sign languages globally" },
];

const ProblemSection = () => {
  const containerRef = useScrollAnimate();

  return (
    <section className="relative py-24 sm:py-32">
      <div className="section-divider mb-24" />
      <div ref={containerRef} className="max-w-6xl mx-auto px-6">
        <div className="scroll-animate text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">The Problem</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            <span className="heading-underline">Millions Are Left Without a Voice</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-6">
            The communication gap between deaf and hearing communities remains one of the most 
            overlooked accessibility challenges in the world.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 stagger-children">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="scroll-animate-scale text-center p-8 rounded-2xl bg-card border border-border glow-border-hover transition-all duration-500 shimmer hover:scale-[1.03]"
            >
              <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              <p className="text-muted-foreground mt-3 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
