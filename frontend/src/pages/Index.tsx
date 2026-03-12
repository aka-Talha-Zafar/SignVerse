import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import TechStackSection from "@/components/landing/TechStackSection";
import DifferentiatorsSection from "@/components/landing/DifferentiatorsSection";
import TargetUsersSection from "@/components/landing/TargetUsersSection";
import FooterSection from "@/components/landing/FooterSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TechStackSection />
        <DifferentiatorsSection />
        <TargetUsersSection />
      </main>
      <FooterSection />
    </div>
  );
};

export default Index;
