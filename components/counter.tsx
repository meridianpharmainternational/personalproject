"use client";

import { useEffect, useRef } from "react";

/**
 * Animated count-up. Renders "0" in SSR HTML (crawler-safe), then tweens
 * 0 -> target (cubic ease-out) the first time it scrolls into view.
 */
export function Counter({
  target,
  suffix = "",
  duration = 1700,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;

    const animate = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = target.toLocaleString() + suffix;
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !done) {
            done = true;
            animate();
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, suffix, duration]);

  return (
    <span ref={ref} className="counter">
      0{suffix}
    </span>
  );
}
