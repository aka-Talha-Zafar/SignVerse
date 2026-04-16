import { Hand, Github, Linkedin, Mail } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useScrollAnimate } from "@/hooks/useScrollAnimate";

const FooterSection = () => {
  const containerRef = useScrollAnimate();
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (pathname === "/" && hash) {
      const id = hash.replace("#", "");
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [pathname, hash]);

  return (
    <footer id="footer" className="relative border-t border-border bg-background">
      {/* Main footer */}
      <div ref={containerRef} className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Brand — spans 5 cols */}
          <div className="md:col-span-5 scroll-animate">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300">
                <Hand className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground tracking-tight">
                Sign<span className="text-primary">Verse</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mt-3">
              A bidirectional ASL translation and learning platform — making communication accessible for everyone.
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Final Year Project · Lahore Garrison University
            </p>
            <div className="flex gap-2.5 mt-5">
              {[
                { Icon: Github, label: "GitHub" },
                { Icon: Linkedin, label: "LinkedIn" },
                { Icon: Mail, label: "Email" },
              ].map(({ Icon, label }) => (
                <button
                  key={label}
                  aria-label={label}
                  className="w-9 h-9 rounded-lg border border-border bg-card/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all duration-300"
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Navigation — spans 3 cols */}
          <div className="md:col-span-3 scroll-animate">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Navigation</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Features", id: "features" },
                { label: "How It Works", id: "how-it-works" },
                { label: "Technology", id: "tech-stack" },
                { label: "Team", id: "footer" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={`/#${link.id}`}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/learn-more" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Learn More
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources — spans 2 cols */}
          <div className="md:col-span-2 scroll-animate">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Privacy Policy", path: "/privacy-policy" },
                { label: "Terms of Service", path: "/terms-of-service" },
                { label: "Accessibility", path: "/accessibility" },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.path} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Team — spans 2 cols */}
          <div className="md:col-span-2 scroll-animate">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">Team</h4>
            <div className="space-y-4">
              {[
                { name: "Uzair Moazzam", role: "AI/ML Pipeline & Backend", initials: "UM" },
                { name: "Talha Zafar", role: "Frontend & System Integration", initials: "TZ" },
              ].map((m) => (
                <div key={m.name} className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-[10px] font-bold group-hover:bg-primary/20 transition-all">
                    {m.initials}
                  </div>
                  <div>
                    <p className="text-sm text-foreground font-medium leading-tight">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.role}</p>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Supervised by <span className="text-primary font-medium">M. Mugees Asif</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SignVerse. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <span className="text-border">·</span>
            <Link to="/signup" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
