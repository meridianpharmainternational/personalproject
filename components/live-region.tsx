"use client";

import { useAnnouncement } from "@/lib/ui-store";

/**
 * Visually hidden polite live region. Every add/remove and result-count change
 * is announced here (keyed so repeated identical messages are re-read).
 * `data-keep-interactive` keeps it in the accessibility tree while a dialog
 * makes the rest of the page inert.
 */
export function LiveRegion() {
  const { n, msg } = useAnnouncement();
  return (
    <div data-keep-interactive className="sr-only" aria-live="polite" aria-atomic="true">
      {n ? <span key={n}>{msg}</span> : null}
    </div>
  );
}
