import { Link } from "react-router-dom";
import { ArrowLeft, Hand } from "lucide-react";

const TermsOfService = () => {
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

        <h1 className="text-3xl sm:text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

        <div className="space-y-8 text-muted-foreground text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>By accessing and using SignVerse, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p>SignVerse provides a bidirectional ASL translation platform that converts sign language to text/speech and text/speech to sign language animations. We also offer interactive ASL learning modules with progress tracking.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information during registration and to update your information as needed.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Acceptable Use</h2>
            <p>You agree not to misuse our services. This includes attempting to reverse-engineer our AI models, using the service for unauthorized commercial purposes, or interfering with other users' access to the platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Intellectual Property</h2>
            <p>All content, AI models, and technology powering SignVerse are the intellectual property of the SignVerse team. You may not reproduce, distribute, or create derivative works without explicit permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Limitation of Liability</h2>
            <p>SignVerse is provided "as is" without warranties. We are not liable for any damages arising from the use of our translation services. Our translations should not be relied upon for critical medical, legal, or emergency communications.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Contact</h2>
            <p>For questions about these terms, contact us at <span className="text-primary">legal@signverse.app</span>.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
