import { useScrollAnimate } from "@/hooks/useScrollAnimate";
import { cn } from "@/lib/utils";
import stackFastapi from "@/assets/stack-fastapi.svg";
import stackNsor from "@/assets/stack-nsor.svg";
import stackKeyframes from "@/assets/stack-keyframes.svg";
import brandVite from "@/assets/brand-vite.svg";
import brandTypescript from "@/assets/brand-typescript.svg";
import brandTailwind from "@/assets/brand-tailwindcss.svg";
import brandReact from "@/assets/brand-react.svg";
import brandReactQuery from "@/assets/brand-reactquery.svg";
import brandRadix from "@/assets/brand-radixui.svg";
import brandOpenCV from "@/assets/brand-opencv.svg";
import brandPyTorch from "@/assets/brand-pytorch.svg";
import brandFirebase from "@/assets/brand-firebase.svg";
import mediapipeLogo from "@/assets/mediapipe-logo.png";
import huggingfaceLogo from "@/assets/huggingface-logo.png";

/** Industry-standard marks (Simple Icons SVGs where available) + official HF asset + product-specific marks. */
const techs = [
  { name: "React 18", desc: "UI, hooks, React Router & client-side NSOR pipeline", logo: brandReact },
  { name: "TypeScript", desc: "Typed components, API clients & shared models", logo: brandTypescript },
  { name: "Vite", desc: "Fast dev server & optimized production bundles", logo: brandVite },
  { name: "Tailwind CSS", desc: "Utility-first styling with design tokens", logo: brandTailwind },
  { name: "TanStack Query", desc: "Server-state, caching & async data for APIs", logo: brandReactQuery },
  { name: "shadcn/ui", desc: "Radix primitives & accessible component patterns", logo: brandRadix },
  { name: "MediaPipe", desc: "Holistic hand, face & pose landmarks", logo: mediapipeLogo },
  { name: "OpenCV", desc: "Server-side JPEG decode & resize before vision", logo: brandOpenCV },
  { name: "PyTorch", desc: "Conv1D + Transformer sign model & alphabet CNN", logo: brandPyTorch },
  { name: "FastAPI", desc: "Python REST — sign, translate, TTS, learning", logo: stackFastapi },
  { name: "Hugging Face", desc: "Hosted Spaces for GPU-ready API deployment", logo: huggingfaceLogo },
  { name: "Firebase", desc: "Auth, Firestore & learning progress sync", logo: brandFirebase },
  { name: "NSOR", desc: "Display polish: caps, punctuation, spacing only", logo: stackNsor },
  { name: "Keyframe lexicon", desc: "Text-to-sign clips from database.json", logo: stackKeyframes },
];

const TechStackSection = () => {
  const containerRef = useScrollAnimate();

  return (
    <section id="tech-stack" className="relative py-24 sm:py-32">
      <div className="section-divider mb-24" />
      <div ref={containerRef} className="max-w-6xl mx-auto px-6">
        <div className="scroll-animate text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Technology Stack</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            <span className="heading-underline">Built on Cutting-Edge AI</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children">
          {techs.map((tech, i) => {
            const isSecondLast = i === techs.length - 2;
            const isLast = i === techs.length - 1;
            return (
            <div
              key={tech.name}
              className={cn(
                "scroll-animate-scale group p-6 rounded-2xl bg-card border border-border text-center hover:border-primary/30 transition-all duration-500 hover:scale-105 magnetic-hover shimmer",
                isSecondLast && "col-start-1 sm:col-start-2 lg:col-start-2",
                isLast && "col-start-2 sm:col-start-3 lg:col-start-3",
              )}
              style={{ transitionDelay: `${i * 0.05}s` }}
            >
              <div className="w-16 h-16 rounded-xl bg-white mx-auto mb-4 flex items-center justify-center shadow-sm ring-1 ring-black/5 group-hover:ring-primary/20 transition-all duration-500 overflow-hidden group-hover:shadow-md">
                <img
                  src={tech.logo}
                  alt=""
                  aria-hidden
                  className="h-10 w-10 object-contain transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1">{tech.name}</h3>
              <p className="text-muted-foreground text-xs leading-snug">{tech.desc}</p>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TechStackSection;
