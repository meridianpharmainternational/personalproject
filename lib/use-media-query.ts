"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Live result of a CSS media query; null during server render and the first paint. */
export function useMediaQuery(query: string): boolean | null {
  const subscribe = useCallback(
    (cb: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore<boolean | null>(subscribe, () => window.matchMedia(query).matches, () => null);
}
