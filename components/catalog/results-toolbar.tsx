"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { LayoutGrid, PanelLeftClose, PanelLeftOpen, Rows3, SlidersHorizontal, X } from "lucide-react";
import { SORTS, type SortKey, type ViewMode } from "@/components/catalog/catalog-model";

/**
 * matchMedia as an external store; null on the server and during hydration, so the
 * first client render matches the server HTML. (Lives here rather than in
 * medicine-catalog.tsx, which imports this module, to avoid an import cycle.)
 */
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

/** Below 360px the Filters button drops its word and the sort options switch to these shorter labels. */
const NARROW_QUERY = "(max-width: 359.98px)";
const SORT_SHORT: Record<SortKey, string> = {
  recommended: "Featured",
  "name-asc": "Name A–Z",
  "name-desc": "Name Z–A",
  molecule: "Molecule",
  stock: "In stock",
};

export type ActiveChip = {
  key: string;
  label: string;
  /** Accessible name; defaults to "Remove filter {label}". */
  ariaLabel?: string;
  remove: () => void;
};

/**
 * Sticky band under the header. Desktop: results count · active-filter chips ·
 * Sort · Grid/List · Hide filters. Mobile: Filters (n) · Sort · Grid/List (the
 * count and chips sit under the band so it stays one 56px row). Below 360px the
 * Filters button is icon + count and the sort options use short labels, so
 * nothing clips at 320px.
 * `.is-stuck` comes from a 1px sentinel just above the band.
 */
export function ResultsToolbar({
  countText,
  chips,
  onClearAll,
  onChipsEmptied,
  sort,
  onSort,
  searching = false,
  view,
  onView,
  filterCount,
  onOpenFilters,
  sheetOpen,
  sidebarId,
  sidebarHidden,
  onToggleSidebar,
  onHeight,
}: {
  countText: string;
  chips: ActiveChip[];
  onClearAll: () => void;
  onChipsEmptied: () => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  /** A search is active, so the default sort is relevance-ranked: label it "Best match". */
  searching?: boolean;
  /** null while the default view is still being resolved (first paint). */
  view: ViewMode | null;
  onView: (v: ViewMode) => void;
  filterCount: number;
  onOpenFilters: () => void;
  sheetOpen: boolean;
  sidebarId: string;
  sidebarHidden: boolean;
  onToggleSidebar: () => void;
  /** Rendered band height (it can grow when many chips wrap on desktop). */
  onHeight: (px: number) => void;
}) {
  const sortId = useId();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  // null (server / hydration) renders the full labels, so there is no hydration mismatch.
  const narrow = useMediaQuery(NARROW_QUERY) === true;
  const heightCb = useRef(onHeight);
  heightCb.current = onHeight;

  // Sentinel observer → is-stuck (re-created when the header height changes at 1024px).
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    let io: IntersectionObserver | null = null;
    const setup = () => {
      io?.disconnect();
      const h = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 64;
      io = new IntersectionObserver(
        ([entry]) => setStuck(!entry.isIntersecting && entry.boundingClientRect.top < h + 1),
        { rootMargin: `-${h + 1}px 0px 0px 0px`, threshold: 0 },
      );
      io.observe(el);
    };
    setup();
    mq.addEventListener("change", setup);
    return () => {
      io?.disconnect();
      mq.removeEventListener("change", setup);
    };
  }, []);

  // Report the band height so the sticky sidebar and table header sit right under it.
  useEffect(() => {
    const el = bandRef.current;
    if (!el || !("ResizeObserver" in window)) return;
    const ro = new ResizeObserver(() => heightCb.current(Math.round(el.getBoundingClientRect().height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <div className="relative" aria-hidden="true">
        <div ref={sentinelRef} className="pointer-events-none absolute inset-x-0 top-0 h-px" />
      </div>
      <div ref={bandRef} className={`toolbar-band${stuck ? " is-stuck" : ""}`}>
        <div className="container-grid results-toolbar">
          <p className="results-count hidden lg:block">{countText}</p>
          <div className="hidden min-w-0 flex-1 lg:block">
            <ActiveChips chips={chips} onClearAll={onClearAll} onEmptied={onChipsEmptied} />
          </div>

          <div className="flex w-full items-center gap-1.5 max-[359.98px]:gap-1 lg:ml-auto lg:w-auto lg:gap-3">
            {/* Below 360px: icon + "(n)" only; the word stays for assistive tech, so the name is still "Filters (n)". */}
            <button
              type="button"
              className="btn btn-secondary btn-sm px-3 max-[359.98px]:gap-1 lg:hidden"
              onClick={onOpenFilters}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
            >
              <SlidersHorizontal aria-hidden className="hidden max-[359.98px]:block min-[420px]:block" />
              {/* With no count the wrapper goes sr-only too, so it adds no flex gap and the button stays 44px square. */}
              <span className={filterCount > 0 ? undefined : "max-[359.98px]:sr-only"}>
                <span className="max-[359.98px]:sr-only">Filters</span>
                {filterCount > 0 ? ` (${filterCount})` : ""}
              </span>
            </button>

            <label htmlFor={sortId} className="sr-only lg:not-sr-only lg:whitespace-nowrap lg:text-sm lg:text-fg-muted">
              Sort by
            </label>
            <select
              id={sortId}
              className="select min-h-tap w-auto min-w-0 flex-1 py-0 pl-3 pr-8 lg:flex-none lg:pl-3.5 lg:pr-10"
              value={sort}
              onChange={(e) => onSort(e.target.value as SortKey)}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {searching && s.value === "recommended" ? "Best match" : narrow ? SORT_SHORT[s.value] : s.label}
                </option>
              ))}
            </select>

            {view === null ? (
              <>
                {/* First paint, before the default view is known: phones show the list, wider screens the grid. */}
                <ViewSwitch value="list" onChange={onView} className="md:hidden" />
                <ViewSwitch value="grid" onChange={onView} className="hidden md:inline-flex" />
              </>
            ) : (
              <ViewSwitch value={view} onChange={onView} />
            )}

            <button
              type="button"
              className="btn btn-ghost btn-sm hidden lg:inline-flex"
              aria-controls={sidebarId}
              aria-expanded={!sidebarHidden}
              onClick={onToggleSidebar}
            >
              {sidebarHidden ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
              {sidebarHidden ? "Show filters" : "Hide filters"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ViewSwitch({
  value,
  onChange,
  className = "",
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  className?: string;
}) {
  return (
    <div className={`segmented flex-none ${className}`} role="group" aria-label="View">
      <button type="button" aria-pressed={value === "grid"} aria-label="Grid view" onClick={() => onChange("grid")}>
        <LayoutGrid aria-hidden className="h-5 w-5" />
      </button>
      <button type="button" aria-pressed={value === "list"} aria-label="List view" onClick={() => onChange("list")}>
        <Rows3 aria-hidden className="h-5 w-5" />
      </button>
    </div>
  );
}

/**
 * Active-filter chips + "Clear all". Removing a chip moves focus to the chip
 * that takes its place (or the previous one), never dropping it on <body>.
 */
export function ActiveChips({
  chips,
  onClearAll,
  onEmptied,
}: {
  chips: ActiveChip[];
  onClearAll: () => void;
  onEmptied: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  if (!chips.length) return null;

  const refocus = (index: number) => {
    requestAnimationFrame(() => {
      const left = ref.current ? Array.from(ref.current.querySelectorAll<HTMLButtonElement>("button.chip")) : [];
      const next = left[Math.min(index, left.length - 1)];
      if (next) next.focus();
      else onEmptied();
    });
  };

  return (
    <div ref={ref} className="chip-row items-center" role="group" aria-label="Active filters">
      {chips.map((c, i) => (
        <button
          key={c.key}
          type="button"
          className="chip"
          aria-label={c.ariaLabel ?? `Remove filter ${c.label}`}
          onClick={() => {
            c.remove();
            refocus(i);
          }}
        >
          <span className="max-w-[16rem] truncate">{c.label}</span>
          <X aria-hidden />
        </button>
      ))}
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => {
          onClearAll();
          requestAnimationFrame(onEmptied);
        }}
      >
        Clear all
      </button>
    </div>
  );
}
