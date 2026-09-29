"use client";

import { useEffect } from "react";

const PENDING = ".reveal:not(.is-visible)";

/** `node` itself plus every descendant matching `selector`. */
function collect(node: Node, selector: string): Element[] {
  if (!(node instanceof Element)) return [];
  const found = Array.from(node.querySelectorAll(selector));
  if (node.matches(selector)) found.unshift(node);
  return found;
}

/**
 * Mounted once in the root layout. Reveals any `.reveal` element as it scrolls
 * into view (adds `.is-visible`). One-shot per element.
 *
 * It does not re-scan per route: a MutationObserver picks up `.reveal`
 * elements whenever they enter the DOM — client navigation, content streamed
 * in after a loading boundary, "Show more" — so nothing is left at opacity 0.
 */
export function RevealObserver() {
  useEffect(() => {
    // Tells the inline <head> script in app/layout.tsx that the observer is running, so it keeps the .js reveal gate.
    (window as Window & { __mpReveal?: boolean }).__mpReveal = true;

    const io =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries, observer) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  entry.target.classList.add("is-visible");
                  observer.unobserve(entry.target);
                }
              });
            },
            { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
          )
        : null;

    // Without IntersectionObserver, show everything straight away.
    const track = (el: Element) => {
      if (io) io.observe(el);
      else el.classList.add("is-visible");
    };

    collect(document.body, PENDING).forEach(track);

    if (!("MutationObserver" in window)) {
      return () => io?.disconnect();
    }

    const mo = new MutationObserver((records) => {
      records.forEach((record) => {
        // Let go of reveals that left the page (moved nodes stay connected).
        if (io) {
          record.removedNodes.forEach((node) => {
            if (node.isConnected) return;
            collect(node, ".reveal").forEach((el) => io.unobserve(el));
          });
        }
        record.addedNodes.forEach((node) => {
          if (!node.isConnected) return;
          collect(node, PENDING).forEach(track);
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io?.disconnect();
    };
  }, []);

  return null;
}
