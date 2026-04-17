import { useScrollAnimate } from "@/hooks/useScrollAnimate";
import stackFastapi from "@/assets/stack-fastapi.svg";
import stackBertEncdec from "@/assets/stack-bert-encdec.svg";
import stackTransformersLib from "@/assets/stack-transformers-lib.svg";
import stackPoseformer from "@/assets/stack-poseformer.svg";
import stackBonetransformer from "@/assets/stack-bonetransformer.svg";
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

type Tech = { name: string; desc: string; logo: string };

/** Single technology grid — SVG marks use explicit fills; MediaPipe uses the official PNG asset. */
const techs: Tech[] = [
  { name: "React 18", desc: "UI, hooks & React Router", logo: brandReact },
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
  { name: "Transformers", desc: "EncoderDecoderModel & BertTokenizer for gloss training", logo: stackTransformersLib },
  { name: "BERT (EncoderDecoder)", desc: "English → ASL gloss refinement in text-to-sign training", logo: stackBertEncdec },
  { name: "PoseFormer", desc: "Causal Transformer + Conv1D smoothing on 3D pose", logo: stackPoseformer },
  { name: "BoneTransformer", desc: "Bone-vector sequence model with temporal Conv1D decoder", logo: stackBonetransformer },
];

function TechCard({ tech, i }: { tech: Tech; i: number }) {
  return (
    <div
      className="scroll-animate-scale group p-6 rounded-2xl bg-card border border-border text-center hover:border-primary/30 transition-all duration-500 hover:scale-105 magnetic-hover shimmer w-full max-w-[280px]"
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
}

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

        <p className="scroll-animate text-center text-sm text-muted-foreground mb-10 max-w-2xl mx-auto">
          Logos use official brand colors where applicable (SVG fills).
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children justify-items-center lg:justify-items-stretch">
          {techs.map((tech, i) => (
            <TechCard key={tech.name} tech={tech} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechStackSection;
