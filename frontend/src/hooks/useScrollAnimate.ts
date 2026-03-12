import { useEffect, useRef } from "react";

export function useScrollAnimate() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    // Observe all animation variants
    const selectors = [
      ".scroll-animate",
      ".scroll-animate-left",
      ".scroll-animate-right",
      ".scroll-animate-scale",
    ];
    selectors.forEach((sel) => {
      el.querySelectorAll(sel).forEach((child) => observer.observe(child));
    });

    // Also observe the container itself
    const containerClasses = ["scroll-animate", "scroll-animate-left", "scroll-animate-right", "scroll-animate-scale"];
    if (containerClasses.some((c) => el.classList.contains(c))) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return ref;
}
