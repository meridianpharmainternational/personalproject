"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReviewCard } from "@/components/reviews/review-card";
import type { PublicReview } from "@/lib/reviews";

/**
 * The home page's review carousel: a row of cards that scrolls sideways, one
 * card (and a peek of the next) on phones, two on tablets, three on desktops.
 * Swipe or trackpad scrolling works natively (CSS scroll snap); the Previous /
 * Next buttons move a whole view at a time and the thin bar shows where you are.
 * Nothing moves on its own, so there is no pause control to provide. The row is
 * focusable, so the arrow keys scroll it too.
 *
 * The controls are hidden by CSS when every card already fits (data-count on the
 * root), so they never appear and then vanish after hydration.
 */
export function ReviewCarousel({ reviews, label }: { reviews: PublicReview[]; label: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [view, setView] = useState({ prev: false, next: reviews.length > 1, start: 0, size: 1 });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setView({
      prev: el.scrollLeft > 4,
      next: el.scrollLeft < max - 4,
      start: el.scrollWidth ? el.scrollLeft / el.scrollWidth : 0,
      size: el.scrollWidth ? el.clientWidth / el.scrollWidth : 1,
    });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  /** One view at a time: as many cards as are fully visible. */
  const go = (dir: -1 | 1) => {
    const el = track.current;
    const card = el?.querySelector("li");
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const step = card.getBoundingClientRect().width + gap;
    const perView = Math.max(1, Math.floor((el.clientWidth + gap) / step));
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * step * perView, behavior: smooth ? "smooth" : "auto" });
  };

  return (
    <div
      className="rv-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      data-count={reviews.length}
    >
      <ul ref={track} className="rv-track" tabIndex={0} aria-label="Reviews (scroll sideways for more)">
        {reviews.map((r, i) => (
          <li key={r.id} aria-roledescription="slide" aria-label={`${i + 1} of ${reviews.length}`}>
            <ReviewCard review={r} />
          </li>
        ))}
      </ul>
      <div className="rv-controls">
        <div className="rv-progress" aria-hidden="true">
          <span
            style={{
              width: `${Math.min(100, view.size * 100)}%`,
              transform: `translateX(${view.size ? (view.start / view.size) * 100 : 0}%)`,
            }}
          />
        </div>
        <div className="flex flex-none gap-2">
          <button
            type="button"
            className="icon-btn"
            onClick={() => go(-1)}
            disabled={!view.prev}
            aria-label="Previous reviews"
          >
            <ChevronLeft aria-hidden />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => go(1)}
            disabled={!view.next}
            aria-label="Next reviews"
          >
            <ChevronRight aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
