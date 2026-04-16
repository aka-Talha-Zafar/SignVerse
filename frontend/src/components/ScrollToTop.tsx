import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets window scroll on route changes so new pages start at the top
 * (SPA default keeps previous scroll position). Runs in layout so it fires
 * before other effects (e.g. hash scroll on /welcome#section).
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
