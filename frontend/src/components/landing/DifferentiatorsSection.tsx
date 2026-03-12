import { useScrollAnimate } from "@/hooks/useScrollAnimate";
import { ArrowLeftRight, MessageSquareText, Layers } from "lucide-react";

const diffs = [
  {
    icon: ArrowLeftRight,
    title: "Bidirectional Translation",
    us: "Sign → Text AND Text → Sign",
    them: "Most systems only go one way",
  },
  {
    icon: MessageSquareText,
    title: "Full Sentences",
    us: "Complete, grammatically correct sentences",
    them: "Isolated word recognition only",
  },
  {
    icon: Layers,
    title: "All-in-One Platform",
    us: "Translation + Learning + Practice in one app",
    them: "Separate tools for each function",
  },
];

const DifferentiatorsSection = () => {
  const containerRef = useScrollAnimate();

  return (
    <section className="relative py-24 sm:py-32 bg-card/30">
      <div ref={containerRef} className="max-w-6xl mx-auto px-6">
        <div className="scroll-animate text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Why SignVerse</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            <span className="heading-underline">What Makes Us Different</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
          {diffs.map((d, i) => (
            <div
              key={d.title}
              className={`${i % 2 === 0 ? "scroll-animate-left" : "scroll-animate-right"} group p-8 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-500 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5`}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300">
                <d.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-4">{d.title}</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 group/item">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 group-hover/item:bg-emerald-500/30 transition-colors">
                    <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-sm text-foreground">{d.us}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                  <span className="text-sm text-muted-foreground">{d.them}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DifferentiatorsSection;
