"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const START_EVENT = "meridian:navigation-start";
/** A page change that lands sooner than this shows nothing, so prefetched pages don't flash the bar. */
const SHOW_AFTER_MS = 120;
/** Stop waiting for a page change that never lands (network failure, cancelled). */
const GIVE_UP_MS = 15000;
/** The bar creeps towards this width while it waits, and only reaches 100% when the page arrives. */
const MAX_WAITING = 0.9;

/** Is `url` the page already showing (ignoring the #hash and how the query is encoded)? */
function isCurrentPage(url: URL): boolean {
  const here = window.location;
  return (
    url.pathname === here.pathname &&
    new URLSearchParams(url.search).toString() === new URLSearchParams(here.search).toString()
  );
}

/**
 * Start the bar from code that navigates without a link click, e.g. before
 * `router.push(href)` in a search form. Link clicks start it on their own.
 * Pass the target so pushing the page already showing starts nothing.
 */
export function startNavigationProgress(href?: string) {
  if (href && isCurrentPage(new URL(href, window.location.href))) return;
  window.dispatchEvent(new Event(START_EVENT));
}

/** Will this click make next/link (or the browser) open another page of this site? */
function isPageChangeClick(e: MouseEvent): boolean {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
  if (!(a instanceof HTMLAnchorElement)) return false;
  if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return false;
  const url = new URL(a.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  // The same page, or only its #hash: nothing to load.
  return !isCurrentPage(url);
}

/**
 * A slim bar along the bottom edge of the site header while another page is
 * loading, so a slow response never looks like a dead click. It appears only
 * after SHOW_AFTER_MS, creeps towards 90%, then runs to 100% and fades once
 * the new URL is showing. Pages with their own loading screen (the admin
 * area, the catalogue) take over as soon as it shows. Decorative
 * (aria-hidden): those loading screens and Next's route announcer speak.
 * With reduced motion it is a still, full-width bar.
 * Needs a <Suspense> boundary (useSearchParams).
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  /** Width (0-1) and whether it is finishing; null while hidden. */
  const [bar, setBar] = useState<{ width: number; done: boolean } | null>(null);
  const pending = useRef(false);
  const shown = useRef(false);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timers.current) {
      window.clearTimeout(id);
      window.clearInterval(id);
    }
    timers.current = [];
  }, []);

  const finish = useCallback(() => {
    if (!pending.current) return;
    pending.current = false;
    clearTimers();
    if (!shown.current) return;
    setBar({ width: 1, done: true });
    timers.current.push(
      window.setTimeout(() => {
        shown.current = false;
        setBar(null);
      }, 400),
    );
  }, [clearTimers]);

  const start = useCallback(() => {
    if (pending.current) return;
    pending.current = true;
    clearTimers();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timers.current.push(
      window.setTimeout(() => {
        shown.current = true;
        setBar({ width: still ? 1 : 0.15, done: false });
        if (still) return;
        timers.current.push(
          window.setInterval(() => {
            setBar((b) => (b && !b.done ? { width: b.width + (MAX_WAITING - b.width) * 0.12, done: false } : b));
          }, 350),
        );
      }, SHOW_AFTER_MS),
      window.setTimeout(finish, GIVE_UP_MS),
    );
  }, [clearTimers, finish]);

  // Link clicks, caught in the capture phase before next/link handles them,
  // and code that calls startNavigationProgress().
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (isPageChangeClick(e)) start();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener(START_EVENT, start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(START_EVENT, start);
      clearTimers();
    };
  }, [start, clearTimers]);

  // The new URL is showing, so the page change has landed.
  useEffect(() => {
    finish();
  }, [pathname, search, finish]);

  if (!bar) return null;
  return (
    <span
      aria-hidden="true"
      className={bar.done ? "nav-progress is-done" : "nav-progress"}
      style={{ transform: `scaleX(${bar.width})` }}
    />
  );
}
