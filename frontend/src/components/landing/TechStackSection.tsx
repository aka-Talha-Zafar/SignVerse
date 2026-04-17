import { useScrollAnimate } from "@/hooks/useScrollAnimate";
import stackFastapi from "@/assets/stack-fastapi.svg";
import pytorchLogo from "@/assets/pytorch-logo.svg";
import stackNsor from "@/assets/stack-nsor.svg";
import stackKeyframes from "@/assets/stack-keyframes.svg";
import reactLogo from "@/assets/react-logo.svg";
import mediapipeLogo from "@/assets/mediapipe-logo.png";
import firebaseLogo from "@/assets/firebase-logo.png";
import opencvLogo from "@/assets/opencv-logo.png";
import stackVite from "@/assets/stack-vite.svg";
import stackTypescript from "@/assets/stack-typescript.svg";
import stackTailwind from "@/assets/stack-tailwind.svg";
import stackTanstack from "@/assets/stack-tanstack.svg";
import stackShadcn from "@/assets/stack-shadcn.svg";
import stackHuggingface from "@/assets/stack-huggingface.svg";

/** Ordered: frontend platform → app libraries → vision & ML → APIs & data (BERT / TensorFlow / PoseFormer intentionally omitted). */
const techs = [
  { name: "React 18", desc: "UI, hooks, React Router & client-side NSOR pipeline", logo: reactLogo },
  { name: "TypeScript", desc: "Typed components, API clients & shared models", logo: stackTypescript },
  { name: "Vite", desc: "Fast dev server & optimized production bundles", logo: stackVite },
  { name: "Tailwind CSS", desc: "Utility-first styling with design tokens", logo: stackTailwind },
  { name: "TanStack Query", desc: "Server-state, caching & async data for APIs", logo: stackTanstack },
  { name: "shadcn/ui", desc: "Radix-based accessible primitives & forms", logo: stackShadcn },
  { name: "MediaPipe", desc: "Holistic hand, face & pose landmarks", logo: mediapipeLogo },
  { name: "OpenCV", desc: "Server-side JPEG decode & resize before vision", logo: opencvLogo },
  { name: "PyTorch", desc: "Conv1D + Transformer sign model & alphabet CNN", logo: pytorchLogo },
  { name: "FastAPI", desc: "Python REST — sign, translate, TTS, learning", logo: stackFastapi },
  { name: "Hugging Face", desc: "Hosted Spaces for GPU-ready API deployment", logo: stackHuggingface },
  { name: "Firebase", desc: "Auth, Firestore & learning progress sync", logo: firebaseLogo },
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
          {techs.map((tech, i) => (
            <div
              key={tech.name}
              className="scroll-animate-scale group p-6 rounded-2xl bg-card border border-border text-center hover:border-primary/30 transition-all duration-500 hover:scale-105 magnetic-hover shimmer"
              style={{ transitionDelay: `${i * 0.05}s` }}
            >
              <div className="w-16 h-16 rounded-xl bg-primary/5 mx-auto mb-4 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-500 overflow-hidden group-hover:shadow-lg group-hover:shadow-primary/10">
                <img
                  src={tech.logo}
                  alt=""
                  aria-hidden
                  className="w-12 h-12 object-contain transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1">{tech.name}</h3>
              <p className="text-muted-foreground text-xs leading-snug">{tech.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechStackSection;
