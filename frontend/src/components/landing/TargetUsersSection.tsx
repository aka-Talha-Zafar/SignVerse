import { useScrollAnimate } from "@/hooks/useScrollAnimate";
import { Ear, Users, BookOpen } from "lucide-react";

const users = [
  {
    icon: Ear,
    title: "Deaf & Hard-of-Hearing",
    description: "Express yourself freely in any conversation. SignVerse translates your signs into text and speech in real-time.",
  },
  {
    icon: Users,
    title: "Hearing Non-Signers",
    description: "Communicate naturally with deaf individuals without learning sign language — our AI bridges the gap instantly.",
  },
  {
    icon: BookOpen,
    title: "ASL Learners",
    description: "Master ASL with interactive lessons, real-time feedback on your signing, and progress tracking to stay motivated.",
  },
];

const TargetUsersSection = () => {
  const containerRef = useScrollAnimate();

  return (
    <section className="relative py-24 sm:py-32">
      <div className="section-divider mb-24" />
      <div ref={containerRef} className="max-w-6xl mx-auto px-6">
        <div className="scroll-animate text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Who It's For</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            <span className="heading-underline">Built for Everyone</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
          {users.map((u, i) => (
            <div
              key={u.title}
              className="scroll-animate-scale group p-8 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-500 hover:scale-[1.03] magnetic-hover"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-500 group-hover:shadow-lg group-hover:shadow-primary/15">
                <u.icon className="w-7 h-7 text-primary transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{u.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{u.description}</p>
              {/* Bottom accent line */}
              <div className="mt-6 h-[2px] w-0 group-hover:w-full bg-gradient-to-r from-primary/50 to-transparent transition-all duration-700 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TargetUsersSection;
