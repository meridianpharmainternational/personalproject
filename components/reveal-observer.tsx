"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Mounted once in the root layout. Reveals any `.reveal` element as it scrolls
 * into view (adds `.is-visible`). One-shot per element; re-runs on route change
 * so client-navigated pages don't stay hidden.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>(
      ".reveal:not(.is-visible)",
    );
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
