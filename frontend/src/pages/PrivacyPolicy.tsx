import { Link } from "react-router-dom";
import { ArrowLeft, Hand } from "lucide-react";

const PrivacyPolicy = () => {
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

        <h1 className="text-3xl sm:text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

        <div className="space-y-8 text-muted-foreground text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Information We Collect</h2>
            <p>SignVerse collects minimal data necessary to provide our ASL translation and learning services. This includes account information (name, email), usage data, and camera input processed locally for sign language recognition. We do not store video recordings of your signing sessions.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
            <p>Your information is used to provide and improve our translation services, personalize your learning experience, track progress in ASL courses, and communicate important updates. Camera data is processed in real-time and is not stored on our servers.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Data Security</h2>
            <p>We implement industry-standard security measures to protect your personal information. All data transmissions are encrypted using TLS, and we regularly audit our security practices to ensure your data remains safe.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Third-Party Services</h2>
            <p>We may use third-party analytics and infrastructure services. These services are bound by their own privacy policies and we ensure they meet our data protection standards.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data at any time. You can also request a copy of your data or opt out of non-essential data collection through your account settings.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at <span className="text-primary">privacy@signverse.app</span>.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
