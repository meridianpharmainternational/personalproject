"use client";

import { useCallback, useSyncExternalStore, type MouseEvent } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * sessionStorage: the catalogue view a product was opened from,
 * `{ url: "/medicines?…", id: "<product id>", scrollY, returning? }`.
 *
 * - Written by the catalogue when a product link in its results is clicked
 *   (`rememberCatalogueOrigin`), so it is tied to that one product.
 * - Read by the product page's "Back to results", which uses it only on that
 *   same product. Reached any other way (home rail, header search, a related
 *   product, a fresh landing), the link falls back to an honest label.
 * - `returning` is a one-shot flag set when "Back to results" is followed; the
 *   catalogue's mount then puts the buyer back at the same scroll position and
 *   product (`restoreCatalogueScroll`) and clears it.
 * - `forgetCatalogueOrigin` drops it once the buyer leaves /medicines.
 *
 * The helpers are for client components only (this is a "use client" module).
 */
export const CATALOGUE_ORIGIN_KEY = "meridian.catalogue-origin.v1";

type Origin = { url: string; id: string; scrollY: number; returning?: true };

/**
 * Accepts only a same-origin catalogue URL ("/medicines", "/medicines?…"):
 * never a protocol-relative "//host", another path or anything that parses
 * off-site. Returns the normalised path + search + hash, or null.
 */
function catalogueHref(raw: string | null): string | null {
  if (!raw || raw.length > 2048 || !raw.startsWith("/medicines") || raw.startsWith("//")) return null;
  try {
    // The parser folds "\" into "/" and drops tabs/newlines, so "/medicines\…"
    // or "/medicines/<id>" fail the exact pathname check below.
    const u = new URL(raw, window.location.origin);
    if (u.origin !== window.location.origin || u.pathname.replace(/\/$/, "") !== "/medicines") return null;
    return `/medicines${u.search}${u.hash}`;
  } catch {
    return null;
  }
}

/** The product id in a "/medicines/<id>" link, or null for any other href. */
function productIdFromHref(href: string | null): string | null {
  if (!href || href.length > 2048 || !href.startsWith("/medicines/")) return null;
  try {
    const u = new URL(href, window.location.origin);
    const m = u.origin === window.location.origin ? /^\/medicines\/([^/]+)\/?$/.exec(u.pathname) : null;
    if (!m) return null;
    const id = decodeURIComponent(m[1]);
    return id.length <= 512 ? id : null;
  } catch {
    return null;
  }
}

function currentCatalogueHref(): string | null {
  return catalogueHref(`${window.location.pathname}${window.location.search}`);
}

function readOrigin(): Origin | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(CATALOGUE_ORIGIN_KEY);
  } catch {
    /* storage unavailable */
  }
  if (!raw || raw.length > 4096) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== "object") return null;
    const { url, id, scrollY, returning } = v as Record<string, unknown>;
    const href = typeof url === "string" ? catalogueHref(url) : null;
    if (!href || typeof id !== "string" || !id || id.length > 512) return null;
    const y = typeof scrollY === "number" && Number.isFinite(scrollY) ? Math.max(0, Math.round(scrollY)) : 0;
    return returning === true ? { url: href, id, scrollY: y, returning: true } : { url: href, id, scrollY: y };
  } catch {
    return null;
  }
}

function writeOrigin(o: Origin | null) {
  try {
    if (o) window.sessionStorage.setItem(CATALOGUE_ORIGIN_KEY, JSON.stringify(o));
    else window.sessionStorage.removeItem(CATALOGUE_ORIGIN_KEY);
  } catch {
    /* storage unavailable */
  }
}

/**
 * For the catalogue results' `onClickCapture`: when the click lands on a
 * product link ("/medicines/<id>"), saves this view's URL, that product and
 * the scroll position. `flushUrl` first writes any pending (debounced) URL
 * change, so the saved URL is the view on screen.
 */
export function rememberCatalogueOrigin(target: EventTarget | null, flushUrl?: () => void): void {
  if (!(target instanceof Element)) return;
  const id = productIdFromHref(target.closest("a[href]")?.getAttribute("href") ?? null);
  if (!id) return;
  flushUrl?.();
  const url = currentCatalogueHref();
  if (url) writeOrigin({ url, id, scrollY: window.scrollY });
}

/**
 * For the catalogue's mount effect (returns its cleanup). After "Back to
 * results", puts the buyer back where they left: the same scroll position,
 * with focus on the product they opened (no scroll, so the position holds).
 * Runs two frames after mount, once the saved view preference has settled the
 * layout, and ignores any arrival other than that link.
 */
export function restoreCatalogueScroll(): () => void {
  const o = readOrigin();
  if (!o?.returning) return () => {};
  const done = () => writeOrigin({ url: o.url, id: o.id, scrollY: o.scrollY });
  if (currentCatalogueHref() !== o.url) {
    done();
    return () => {};
  }
  // The flag is cleared only when the restore actually runs, so a cancelled
  // first pass (StrictMode's mount → unmount → mount) still restores.
  let raf = requestAnimationFrame(() => {
    raf = requestAnimationFrame(() => {
      done();
      // "instant" overrides the page's smooth scroll-behavior.
      window.scrollTo({ top: o.scrollY, behavior: "instant" });
      const link = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/medicines/"]')).find(
        (a) => a.offsetParent !== null && productIdFromHref(a.getAttribute("href")) === o.id,
      );
      link?.focus({ preventScroll: true });
    });
  });
  return () => cancelAnimationFrame(raf);
}

/** Drops the saved origin (e.g. when the buyer leaves /medicines). */
export function forgetCatalogueOrigin(): void {
  writeOrigin(null);
}

/* sessionStorage does not notify the same tab; the snapshot is read on render. */
const subscribeNone = () => () => {};
const serverSnapshot = () => null;

/**
 * "Back to results" link for the product page. When this product was opened
 * from the catalogue in this tab, returns the buyer to that exact view
 * (filters, search, sort, paging) and, via `restoreCatalogueScroll`, to their
 * place in it. Otherwise it links to `fallback` (the product's category or
 * "/medicines") under `fallbackLabel` ("All {category}" / "Browse the
 * catalogue"). The server and the hydration pass render the fallback, so the
 * markup never mismatches; client-side navigations read the origin on the
 * first render.
 */
export function BackToResults({
  productId,
  fallback,
  fallbackLabel,
  className,
}: {
  productId: string;
  fallback: string;
  fallbackLabel: string;
  className?: string;
}) {
  const getSnapshot = useCallback(() => {
    const o = readOrigin();
    return o && o.id === productId ? o.url : null;
  }, [productId]);
  const saved = useSyncExternalStore(subscribeNone, getSnapshot, serverSnapshot);

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Only a same-tab follow sets the one-shot flag (not a new-tab/window click).
    if (!saved || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const o = readOrigin();
    if (o && o.id === productId) writeOrigin({ ...o, returning: true });
  };

  // Ghost link at the crumbs' 44px row height; the negative margin lines the
  // arrow up with the breadcrumb's left edge.
  return (
    <Link
      href={saved ?? fallback}
      onClick={onClick}
      className={`btn btn-ghost -ml-2.5 min-h-tap${className ? ` ${className}` : ""}`}
    >
      <ArrowLeft aria-hidden strokeWidth={1.75} />
      {saved ? "Back to results" : fallbackLabel}
    </Link>
  );
}
