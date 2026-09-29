"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * Fixed "Back to top" icon button, shown after two screens of scrolling.
 * Moves focus to `targetId` (the page <h1>) so keyboard users land at the top too.
 */
export function BackToTop({ targetId }: { targetId: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      setShow(window.scrollY > window.innerHeight * 2);
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      className="icon-btn back-to-top"
      aria-label="Back to top"
      onClick={() => {
        window.scrollTo({ top: 0 });
        document.getElementById(targetId)?.focus({ preventScroll: true });
      }}
    >
      <ArrowUp aria-hidden />
    </button>
  );
}
