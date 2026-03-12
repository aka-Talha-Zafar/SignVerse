import { Link } from "react-router-dom";
import { ArrowLeft, Hand } from "lucide-react";

const Accessibility = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="absolute top-6 left-6 z-20">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to home
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-24">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Hand className="w-4 h-4 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight">Sign<span className="text-primary">Verse</span></span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold mb-8">Accessibility Statement</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

        <div className="space-y-8 text-muted-foreground text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Our Commitment</h2>
            <p>SignVerse is built with accessibility at its core. As a platform designed to bridge the communication gap between deaf and hearing communities, we are deeply committed to making our platform usable by everyone, regardless of ability.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Accessibility Features</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Full keyboard navigation support across all features</li>
              <li>Screen reader compatibility with ARIA labels and landmarks</li>
              <li>High contrast mode and customizable text sizing</li>
              <li>Visual feedback for all audio-based interactions</li>
              <li>Captions and text alternatives for all media content</li>
              <li>Responsive design that works on all devices and screen sizes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Standards Compliance</h2>
            <p>We strive to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards. Our team regularly audits the platform to identify and resolve accessibility barriers.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Continuous Improvement</h2>
            <p>We are continuously working to improve the accessibility of our platform. If you encounter any accessibility barriers or have suggestions for improvement, please contact us at <span className="text-primary">accessibility@signverse.app</span>.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Accessibility;
