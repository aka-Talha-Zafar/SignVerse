import { useState } from "react";
import { Link } from "react-router-dom";
import { Hand, ArrowLeft, Mail, ArrowRight, CheckCircle } from "lucide-react";
import FloatingOrbs from "@/components/landing/FloatingOrbs";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center overflow-hidden">
      <FloatingOrbs />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-8 animate-fade-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          <Link to="/" className="inline-flex items-center gap-2.5 group mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300">
              <Hand className="w-5 h-5 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground tracking-tight">
              Sign<span className="text-primary">Verse</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-4">Reset your password</h1>
          <p className="text-muted-foreground text-sm mt-2">We'll send you a link to reset it</p>
        </div>

        <div
          className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-8 glow-border animate-fade-up"
          style={{ animationDelay: "0.2s", animationFillMode: "both" }}
        >
          {sent ? (
            <div className="text-center py-4 animate-fade-up">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Check your email</h3>
              <p className="text-sm text-muted-foreground mb-6">
                We've sent a password reset link to <span className="text-foreground font-medium">{email}</span>
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email address</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 shimmer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p
          className="text-center text-sm text-muted-foreground mt-6 animate-fade-up"
          style={{ animationDelay: "0.3s", animationFillMode: "both" }}
        >
          <Link to="/login" className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
