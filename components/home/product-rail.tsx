"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CatalogItem } from "@/lib/catalog";
import { ProductCard } from "@/components/catalog/product-card";
import { ProductRow } from "@/components/catalog/product-row";

/** One tab of the home product rail. The server picks `items` (max 8) per tab. */
export type RailTab = {
  key: string;
  label: string;
  /** Visually hidden suffix for the tab name, e.g. " products" after "All". */
  srSuffix?: string;
  count: number;
  href: string;
  viewAllLabel: string;
  items: CatalogItem[];
};

const GRID_N = 8; // cards from 640px
const ROWS_N = 6; // list rows on phones
const FADE_MS = 150;

/**
 * Home "Browse the range" rail: ARIA tabs (automatic activation, roving
 * tabindex, Arrow/Home/End keys) over one tab panel. Switching fades the set
 * out and back in (150ms, `is-updating`). Cards from 640px, rows below.
 */
export function ProductRail({ tabs }: { tabs: RailTab[] }) {
  const [selected, setSelected] = useState(0);
  const [shown, setShown] = useState(0);
  const [updating, setUpdating] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const timer = useRef<number | undefined>(undefined);
  const baseId = useId();
  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = `${baseId}-panel`;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!tabs.length) return null;

  const select = (i: number, focus = false) => {
    if (focus) tabRefs.current[i]?.focus();
    if (i === selected) return;
    setSelected(i);
    window.clearTimeout(timer.current);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(i);
      setUpdating(false);
      return;
    }
    setUpdating(true);
    timer.current = window.setTimeout(() => {
      setShown(i);
      setUpdating(false);
    }, FADE_MS);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = i === last ? 0 : i + 1;
    else if (e.key === "ArrowLeft") next = i === 0 ? last : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    select(next, true);
  };

  const tab = tabs[shown] ?? tabs[0];
  const gridItems = tab.items.slice(0, GRID_N);
  const rowItems = tab.items.slice(0, ROWS_N);
  const showing = (n: number) => (tab.count <= n ? `Showing all ${tab.count}` : `Showing ${n} of ${tab.count}`);

  return (
    <div>
      <div role="tablist" aria-label="Product range by category" className="tabs">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(i)}
            aria-selected={i === selected}
            aria-controls={panelId}
            tabIndex={i === selected ? 0 : -1}
            className="tab"
            onClick={() => select(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.label}
            {t.srSuffix && <span className="sr-only">{t.srSuffix}</span>}
            <span className="count">{t.count}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={tabId(selected)} className="mt-6 lg:mt-8">
        <div className={`results-grid no-filters hidden sm:grid${updating ? " is-updating" : ""}`}>
          {gridItems.map((item, i) => (
            <ProductCard key={item.id} item={item} index={i} />
          ))}
        </div>

        <ul
          className={`border-t border-rule transition-opacity duration-150 ease-out sm:hidden${updating ? " opacity-40" : ""}`}
        >
          {rowItems.map((item, i) => (
            <ProductRow key={item.id} item={item} index={i} />
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="loadmore-text">
            <span className="sm:hidden">{showing(rowItems.length)}</span>
            <span className="hidden sm:inline">{showing(gridItems.length)}</span>
          </p>
          <Link href={tab.href} className="btn btn-secondary">
            {tab.viewAllLabel}
            <ArrowRight aria-hidden strokeWidth={1.75} className="icon-trail" />
          </Link>
        </div>
      </div>
    </div>
  );
}
