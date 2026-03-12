import { useScrollAnimate } from "@/hooks/useScrollAnimate";
import tensorflowLogo from "@/assets/tensorflow-logo.svg";
import pytorchLogo from "@/assets/pytorch-logo.png";
import bertLogo from "@/assets/bert-logo.svg";
import reactLogo from "@/assets/react-logo.svg";
import mediapipeLogo from "@/assets/mediapipe-logo.png";
import poseformerLogo from "@/assets/poseformer-logo.png";
import firebaseLogo from "@/assets/firebase-logo.png";
import opencvLogo from "@/assets/opencv-logo.png";

const techs = [
  { name: "MediaPipe", desc: "Hand & Pose Tracking", logo: mediapipeLogo },
  { name: "TensorFlow", desc: "Deep Learning", logo: tensorflowLogo },
  { name: "PyTorch", desc: "Model Training", logo: pytorchLogo },
  { name: "BERT", desc: "NLP Processing", logo: bertLogo },
  { name: "PoseFormer", desc: "3D Pose Estimation", logo: poseformerLogo },
  { name: "React.js", desc: "Frontend UI", logo: reactLogo },
  { name: "Firebase", desc: "Backend & Auth", logo: firebaseLogo },
  { name: "OpenCV", desc: "Computer Vision", logo: opencvLogo },
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-children">
          {techs.map((tech, i) => (
            <div
              key={tech.name}
              className="scroll-animate-scale group p-6 rounded-2xl bg-card border border-border text-center hover:border-primary/30 transition-all duration-500 hover:scale-105 magnetic-hover shimmer"
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <div className="w-16 h-16 rounded-xl bg-primary/5 mx-auto mb-4 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-500 overflow-hidden group-hover:shadow-lg group-hover:shadow-primary/10">
                <img
                  src={tech.logo}
                  alt={tech.name}
                  className="w-12 h-12 object-contain transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1">{tech.name}</h3>
              <p className="text-muted-foreground text-xs">{tech.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechStackSection;
