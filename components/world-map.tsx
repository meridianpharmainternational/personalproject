"use client";

import { useEffect, useRef } from "react";

/**
 * Procedurally-drawn dotted-continents world map (SVG). Client-only because it
 * uses Math.random() to scatter dots (avoids hydration mismatch). Colour via
 * `currentColor` on the wrapper.
 */
export function WorldMap({ className = "" }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const group = svg.querySelector("g");
    if (!group) return;
    group.innerHTML = "";
    const ns = "http://www.w3.org/2000/svg";

    // Rough continent blocks: {x, y, w, h, d(ensity)}
    const regions = [
      { x: 55, y: 55, w: 105, h: 80, d: 0.55 }, // N. America
      { x: 120, y: 135, w: 55, h: 105, d: 0.6 }, // S. America
      { x: 225, y: 55, w: 60, h: 55, d: 0.6 }, // Europe
      { x: 235, y: 105, w: 80, h: 120, d: 0.62 }, // Africa
      { x: 300, y: 60, w: 130, h: 95, d: 0.55 }, // Asia
      { x: 380, y: 175, w: 65, h: 55, d: 0.6 }, // Oceania
    ];
    const step = 8;

    regions.forEach((r) => {
      for (let yy = r.y; yy < r.y + r.h; yy += step) {
        for (let xx = r.x; xx < r.x + r.w; xx += step) {
          if (Math.random() > r.d) continue;
          const fx = (xx - r.x) / r.w;
          const fy = (yy - r.y) / r.h;
          const edge = Math.min(fx, 1 - fx, fy, 1 - fy);
          if (Math.random() > edge * 2) continue;
          const c = document.createElementNS(ns, "circle");
          c.setAttribute("cx", String(xx));
          c.setAttribute("cy", String(yy));
          c.setAttribute("r", "1.5");
          group.appendChild(c);
        }
      }
    });
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="0 0 500 300"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <g fill="currentColor" />
    </svg>
  );
}
