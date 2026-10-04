"use client";

import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CatalogItem } from "@/lib/catalog";
import { enquiryList } from "@/lib/enquiry-list";
import { customId } from "@/lib/enquiry-actions";
import { announce } from "@/lib/ui-store";
import { site } from "@/lib/site";
import { didYouMean, relaxTokens, relevanceScore } from "@/lib/search-text";
import { openPasteList } from "@/components/enquiry/enquiry-drawer";
import { OpenEnquiryButton } from "@/components/enquiry/open-enquiry-button";
import { ProductCard } from "@/components/catalog/product-card";
import { ProductRow } from "@/components/catalog/product-row";
import { CatalogueFilters } from "@/components/catalog/catalogue-filters";
import { useMediaQuery } from "@/lib/use-media-query";
import { rememberCatalogueOrigin, restoreCatalogueScroll } from "@/components/catalog/back-to-results";
import { CatalogContext, type CatalogHeadContext } from "@/components/catalog/catalog-context";
import {
  EMPTY_FILTERS,
  PAGE_SIZE,
  activeFilterCount,
  buildSearch,
  buildUniverse,
  facetCounts,
  matchesQuery,
  norm,
  normalizeSearch,
  paramsFromSearch,
  parseParams,
  passes,
  sortItems,
  tokenize,
  type CatalogParams,
  type CatalogState,
  type CategoryLite,
  type Filters,
  type SortKey,
  type ViewMode,
} from "@/components/catalog/catalog-model";

/**
 * The public catalogue (/medicines). Owns every piece of catalogue state —
 * search, category, facets, sort, view, paging — and mirrors it to the URL.
 *
 * - Filtering runs here over all active products (lean CatalogItems); facet
 *   counts reflect the other active filters.
 * - URL: ?q=&category=&molecule=a,b&form=&avail=&strength=&sort=&view=&show=
 *   written with history.replaceState (Next syncs useSearchParams, so the
 *   category bar's aria-current follows) — no server round trip, no remount,
 *   focus stays put. Links that navigate here (category bar, header search)
 *   re-key the component on the server; in-place URL changes are adopted too.
 *   A click on a product in the results saves this view for that product's
 *   "Back to results" link (CATALOGUE_ORIGIN_KEY in back-to-results.tsx), which
 *   also brings the buyer back to the same scroll position.
 * - `head` is the server-rendered page head; its client islands
 *   (CatalogueHeading / CatalogueSearch) read this component's context.
 */
export function MedicineCatalog({
  items,
  categories,
  initial,
  head,
}: {
  items: CatalogItem[];
  categories: CategoryLite[];
  /** The request's params (what the server rendered with). */
  initial: CatalogParams;
  head?: ReactNode;
}) {
  const universe = useMemo(() => buildUniverse(items), [items]);
  const searchParams = useSearchParams();
  const spStr = normalizeSearch(searchParams?.toString() ?? "");

  // The URL is the source of truth on the client (e.g. Back to a replaced URL);
  // on the server it is identical to `initial`.
  const [init] = useState<CatalogState>(() =>
    parseParams(
      typeof window === "undefined" || !searchParams ? initial : paramsFromSearch(searchParams),
      universe,
      categories,
    ),
  );
  const [filters, setFilters] = useState<Filters>(init.filters);
  const [sort, setSort] = useState<SortKey>(init.sort);
  const [view, setView] = useState<ViewMode | null>(init.view);
  const [show, setShow] = useState(init.show);
  const [newFrom, setNewFrom] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);

  const resultsHeadingId = useId();
  const resultsRef = useRef<HTMLDivElement>(null);
  const mobile = useMediaQuery("(max-width: 767.98px)");

  /* -------------------------------------------------------- derived */

  const q = useDeferredValue(filters.q);
  const tokens = useMemo(() => tokenize(q), [q]);
  const { category, molecule, form, avail, strength } = filters;
  // Strengths to emphasise on every result view: the strength filters plus any
  // digit-bearing search token ("200mg"), both norm()'d.
  const emph = useMemo<ReadonlySet<string>>(
    () => new Set([...strength.map(norm), ...tokens.filter((t) => /\d/.test(t))]),
    [strength, tokens],
  );
  const facets = useMemo<Filters>(
    () => ({ q: "", category, molecule, form, avail, strength }),
    [category, molecule, form, avail, strength],
  );
  // A search that matches nothing as typed is retried with long misspelt words
  // shortened ("ivermectine" → "ivermectin"). The pool, facet counts and result
  // count all use the same tokens, and the correction is always shown.
  const strictPool = useMemo(() => items.filter((it) => matchesQuery(it, tokens, universe)), [items, tokens, universe]);
  const relaxed = useMemo(
    () => (tokens.length && !strictPool.length ? relaxTokens(tokens, universe.hay.values()) : null),
    [tokens, strictPool, universe],
  );
  const searchTokens = relaxed?.tokens ?? tokens;
  const pool = useMemo(
    () => (relaxed ? items.filter((it) => matchesQuery(it, relaxed.tokens, universe)) : strictPool),
    [relaxed, items, strictPool, universe],
  );
  // norm()'d name and molecule per item, for the relevance ranking below.
  const normNames = useMemo(
    () => new Map(items.map((it) => [it.id, { name: norm(it.name), mol: norm(it.molecule ?? "") }])),
    [items],
  );
  // The query the relevance tiers compare names against: the corrected one when relaxed.
  const wholeQuery = norm(relaxed?.query ?? q);
  // "Recommended" during a search ranks by relevance first, as the header search
  // does, so a product searched by its exact name comes first ("TEST-C" before
  // the TEST-E family). The sort is stable, so sort_order stays the tie-break.
  const results = useMemo(() => {
    const sorted = sortItems(
      pool.filter((it) => passes(it, facets)),
      sort,
    );
    if (sort !== "recommended" || !searchTokens.length) return sorted;
    const score = new Map(
      sorted.map((it) => {
        const n = normNames.get(it.id) ?? { name: norm(it.name), mol: norm(it.molecule ?? "") };
        return [it.id, relevanceScore(n.name, n.mol, searchTokens, wholeQuery)];
      }),
    );
    return sorted.sort((a, b) => (score.get(a.id) ?? 5) - (score.get(b.id) ?? 5));
  }, [pool, facets, sort, searchTokens, normNames, wholeQuery]);
  const counts = useMemo(() => facetCounts(pool, facets), [pool, facets]);
  const total = results.length;
  const shown = Math.min(show, total);
  const visible = useMemo(() => results.slice(0, shown), [results, shown]);

  /* ------------------------------------------------------- updates */

  const flashTimer = useRef(0);
  const flash = useCallback(() => {
    setUpdating(true);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setUpdating(false), 160);
  }, []);
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  /** Change filters; resets paging. `quiet` skips the grid dim (typing). */
  const update = useCallback(
    (fn: (f: Filters) => Filters, quiet = false) => {
      setFilters(fn);
      setShow(PAGE_SIZE);
      setNewFrom(null);
      if (!quiet) flash();
    },
    [flash],
  );

  const setQuery = useCallback((next: string) => update((f) => ({ ...f, q: next }), true), [update]);
  // A new category drops any molecule or form it has no products of, so the dropdowns never lead to an empty page.
  const setCategory = useCallback(
    (slug: string) =>
      update((f) => {
        if (!slug) return { ...f, category: "" };
        const inCategory = items.filter((it) => it.category?.slug === slug);
        const has = (key: "molecule" | "form") => (v: string) => inCategory.some((it) => it[key] === v);
        return { ...f, category: slug, molecule: f.molecule.filter(has("molecule")), form: f.form.filter(has("form")) };
      }),
    [update, items],
  );
  const clearAll = useCallback(() => update(() => EMPTY_FILTERS), [update]);
  const setForm = useCallback((v: string) => update((f) => ({ ...f, form: v ? [v] : [] })), [update]);
  /** "Clear filters": every dropdown filter; the search text stays. */
  const clearFilters = useCallback(() => update((f) => ({ ...EMPTY_FILTERS, q: f.q })), [update]);

  const onSort = (s: SortKey) => {
    setSort(s);
    flash();
  };

  // After "Back to results": restore the buyer's scroll position and focus the product they opened.
  useEffect(() => restoreCatalogueScroll(), []);

  /* ------------------------------------------------------ URL sync */

  const stateRef = useRef<CatalogState>({ filters, sort, view, show });
  stateRef.current = { filters, sort, view, show };
  const pathRef = useRef<string | null>(null);
  const lastWritten = useRef(spStr);
  const recentWrites = useRef(new Set([spStr]));
  const writeTimer = useRef(0);
  const prevQ = useRef(filters.q);

  const writeUrl = useCallback(() => {
    window.clearTimeout(writeTimer.current);
    if (pathRef.current && window.location.pathname !== pathRef.current) return;
    const qs = buildSearch(window.location.search, stateRef.current);
    const next = normalizeSearch(qs);
    lastWritten.current = next;
    if (next !== normalizeSearch(window.location.search)) {
      recentWrites.current.add(next);
      // Passing our own state object (not Next's) lets Next sync useSearchParams.
      window.history.replaceState(null, "", `${window.location.pathname}${qs}${window.location.hash}`);
    }
  }, []);

  useEffect(() => {
    if (!pathRef.current) pathRef.current = window.location.pathname;
    const typing = prevQ.current !== filters.q;
    prevQ.current = filters.q;
    window.clearTimeout(writeTimer.current);
    writeTimer.current = window.setTimeout(writeUrl, typing ? 300 : 0);
    return () => window.clearTimeout(writeTimer.current);
  }, [filters, sort, view, show, writeUrl]);

  // Adopt URL changes we did not make (e.g. "All products" in the category bar
  // while already on /medicines).
  useEffect(() => {
    if (spStr === lastWritten.current) {
      recentWrites.current = new Set([spStr]);
      return;
    }
    if (recentWrites.current.has(spStr)) return; // late echo of one of our own writes
    lastWritten.current = spStr;
    recentWrites.current = new Set([spStr]);
    const p = parseParams(paramsFromSearch(new URLSearchParams(spStr)), universe, categories);
    prevQ.current = p.filters.q;
    setFilters(p.filters);
    setSort(p.sort);
    setView(p.view);
    setShow(p.show);
    setNewFrom(null);
  }, [spStr, universe, categories]);

  // With exactly one molecule selected: its products within the active category,
  // filtered as generateMetadata (app/medicines/(catalogue)/page.tsx) does, so the head's
  // counts match the <title>.
  const molName = filters.molecule.length === 1 ? filters.molecule[0] : "";
  const moleculeScope = useMemo(() => {
    if (!molName) return null;
    const hits = items.filter(
      (it) => it.molecule === molName && (!filters.category || it.category?.slug === filters.category),
    );
    return {
      count: hits.length,
      categoryCount: new Set(hits.flatMap((it) => (it.category ? [it.category.slug] : []))).size,
      forms: [...new Set(hits.flatMap((it) => (it.form ? [it.form] : [])))],
    };
  }, [items, molName, filters.category]);

  // Keep the tab title in step when the category or molecule changes in place
  // (the server title from generateMetadata covers the first paint and link
  // navigations).
  const titleSynced = useRef(false);
  useEffect(() => {
    if (!titleSynced.current) {
      titleSynced.current = true;
      return;
    }
    const cat = categories.find((c) => c.slug === filters.category)?.name;
    const n = moleculeScope?.count ?? 0;
    const products = `${n} product${n === 1 ? "" : "s"}`;
    const base =
      molName && moleculeScope
        ? cat
          ? `${molName} in ${cat} — ${products}`
          : `${molName} — ${products}`
        : (cat ?? "Product catalogue");
    document.title = `${base} · ${site.name}`;
  }, [filters.category, molName, moleculeScope, categories]);

  /* ------------------------------------------- count + announcements */

  const qText = filters.q.trim();
  // The search is the only active chip (no category or facet filters).
  const searchOnly = qText !== "" && activeFilterCount(filters) === 0;
  const emptyTitle = searchOnly ? `No products match “${qText}”.` : "No products match these filters.";
  const countText = total === 0 ? "No products" : total === 1 ? "Showing 1 of 1" : `Showing 1–${shown} of ${total}`;
  const spoken =
    total === 0
      ? emptyTitle
      : `${relaxed ? `Showing results for “${relaxed.query}”. ` : ""}Showing ${total === 1 ? "1" : `1 to ${shown}`} of ${total} product${total === 1 ? "" : "s"}.`;
  const prevSpoken = useRef(spoken);
  useEffect(() => {
    if (prevSpoken.current === spoken) return;
    prevSpoken.current = spoken;
    const t = window.setTimeout(() => announce(spoken), 500);
    return () => window.clearTimeout(t);
  }, [spoken]);

  const focusResults = useCallback(() => {
    document.getElementById(resultsHeadingId)?.focus({ preventScroll: true });
  }, [resultsHeadingId]);

  /* ------------------------------------------------------ load more */

  const focusAt = useRef<number | null>(null);
  const loadMore = () => {
    focusAt.current = shown;
    setNewFrom(shown);
    setShow(shown + PAGE_SIZE);
  };
  // Move focus to the first newly shown product's title link.
  useEffect(() => {
    if (focusAt.current === null) return;
    const raf = requestAnimationFrame(() => {
      const i = focusAt.current;
      focusAt.current = null;
      if (i === null || !resultsRef.current) return;
      const links = Array.from(
        resultsRef.current.querySelectorAll<HTMLAnchorElement>(".pcard-title a, .prow-title a, a.pname"),
      ).filter((a) => a.offsetParent !== null);
      links[i]?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [show]);

  // Empty state: "Did you mean Ivermectin (13)?" when the search misspells a molecule.
  const dym = useMemo(
    () => (total === 0 ? didYouMean(tokens, universe.molecules, (o) => o.value) : null),
    [total, tokens, universe],
  );

  // Empty state: a product or molecule we list, searched with a dose we don't
  // ("cenforce 250mg", "ivermectin 18mg"). The same search without its number
  // tokens, brand names mapped to their molecule ("anavar" → "oxandrolone")
  // and long misspelt words shortened as above, within the current filters:
  // "Show “cenforce” in other strengths (7)". Null when the search has no number
  // token, has nothing else, or still matches nothing.
  const otherStrengths = useMemo(() => {
    if (total > 0) return null;
    const words = searchTokens.filter((t) => !/^\d/.test(t));
    if (!words.length || words.length === searchTokens.length) return null;
    const t = relaxTokens(words, universe.hay.values())?.tokens ?? words;
    const n = items.filter((it) => matchesQuery(it, t, universe) && passes(it, facets)).length;
    return n > 0 ? { q: t.join(" "), n } : null;
  }, [total, searchTokens, items, universe, facets]);

  /* -------------------------------------------------------- requests */

  /**
   * "Request a product" / "Request it": sends the search text as a custom line
   * and opens the drawer. With no search text there is nothing to name the line
   * after (and custom lines cannot be renamed), so it opens the drawer's
   * "Paste a list" box instead.
   */
  const requestProduct = () => {
    const name = filters.q.trim();
    if (!name) {
      openPasteList();
      return;
    }
    enquiryList.add(
      { medicineId: customId(name), name, molecule: null, form: null, strengths: [], strength: null, image: null },
      { open: true },
    );
  };

  /* ---------------------------------------------------- head context */

  const moleculesByCategory = useMemo(() => {
    const sets = new Map<string, Set<string>>();
    for (const it of items) {
      if (!it.category || !it.molecule) continue;
      const s = sets.get(it.category.slug) ?? new Set<string>();
      s.add(it.molecule);
      sets.set(it.category.slug, s);
    }
    return new Map([...sets].map(([k, s]) => [k, s.size]));
  }, [items]);

  const headCtx = useMemo<CatalogHeadContext>(
    () => ({
      categories,
      category: filters.category,
      molecule: filters.molecule,
      moleculeScope,
      q: filters.q,
      setQuery,
      flushUrl: writeUrl,
      total: items.length,
      categoryCount: categories.length,
      moleculeCount: universe.molecules.length,
      moleculesByCategory,
      resultCount: total,
      correctedTo: relaxed?.query ?? null,
    }),
    [
      categories,
      filters.category,
      filters.molecule,
      moleculeScope,
      filters.q,
      setQuery,
      writeUrl,
      items.length,
      universe.molecules.length,
      moleculesByCategory,
      total,
      relaxed,
    ],
  );

  /* --------------------------------------------------------- render */

  if (!items.length) {
    return (
      <CatalogContext.Provider value={headCtx}>
        {head}
        <div className="container-grid py-10">
          <div className="empty">
            <h2 className="text-h3">The catalogue is not available right now.</h2>
            <p className="measure text-fg-muted">
              We could not load the product list. Please try again in a moment, or paste your product list and our
              export team will reply.
            </p>
            <div className="flex flex-wrap gap-3">
              {/* A full reload on purpose: it retries the catalogue fetch. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/medicines" className="btn btn-primary">
                Try again
              </a>
              <OpenEnquiryButton paste showCount={false} label="Paste a product list" className="btn btn-secondary" />
            </div>
          </div>
        </div>
      </CatalogContext.Provider>
    );
  }

  const isNew = (i: number) => newFrom !== null && i >= newFrom;
  const newIndex = (i: number) => (newFrom !== null ? i - newFrom : 0);
  const listDim = updating ? " opacity-40" : "";
  // Phones get compact rows, wider screens cards. Until the width is known
  // (first paint) both render and CSS shows the right one.
  const showRows = mobile !== false;
  const showGrid = mobile !== true;
  const remaining = total - shown;

  return (
    <CatalogContext.Provider value={headCtx}>
      {head}
      <div className="container-grid pb-16 pt-6 lg:pt-8">
        <CatalogueFilters
          categories={categories}
          universe={universe}
          counts={counts}
          filters={filters}
          sort={sort}
          searching={searchTokens.length > 0}
          countText={countText}
          canClear={activeFilterCount(filters) > 0}
          empty={total === 0}
          onCategory={setCategory}
          onForm={setForm}
          onSort={onSort}
          onClear={clearFilters}
        />

        <section aria-labelledby={resultsHeadingId} className="mt-6">
          <h2 id={resultsHeadingId} tabIndex={-1} className="sr-only">
            Results: {countText}
          </h2>

          {total === 0 ? (
            <div className="empty">
              <h3>{emptyTitle}</h3>
              {dym && (
                <p className="measure">
                  Did you mean{" "}
                  <Link href={`/medicines?molecule=${encodeURIComponent(dym.value)}`} className="link-arrow underline">
                    {dym.value}
                  </Link>
                  ?
                </p>
              )}
              <p className="measure text-fg-muted">
                {otherStrengths
                  ? "We don’t list that strength. See the strengths we do list, or send us a request."
                  : searchOnly
                    ? "Check the spelling or try the molecule name, or send us a request."
                    : "Try removing a filter, or send us a request."}
              </p>
              <div className="flex flex-wrap gap-3">
                {otherStrengths && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setQuery(otherStrengths.q);
                      requestAnimationFrame(focusResults);
                    }}
                  >
                    Show “{otherStrengths.q}” in other strengths
                  </button>
                )}
                {!searchOnly && !otherStrengths && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      clearAll();
                      requestAnimationFrame(focusResults);
                    }}
                  >
                    Clear filters
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={requestProduct}>
                  Request a product
                </button>
              </div>
            </div>
          ) : (
            <div ref={resultsRef} onClickCapture={(e) => rememberCatalogueOrigin(e.target, writeUrl)}>
              {showRows && (
                <ul
                  aria-label="Products"
                  className={`border-t border-rule transition-opacity duration-150${mobile === null ? " md:hidden" : ""}${listDim}`}
                >
                  {visible.map((it, i) => (
                    <ProductRow key={it.id} item={it} isNew={isNew(i)} index={newIndex(i)} emph={emph} />
                  ))}
                </ul>
              )}
              {showGrid && (
                <div
                  className={`results-grid${updating ? " is-updating" : ""}${mobile === null ? " hidden md:grid" : ""}`}
                >
                  {visible.map((it, i) => (
                    <ProductCard
                      key={it.id}
                      item={it}
                      isNew={isNew(i)}
                      index={newIndex(i)}
                      priority={i < 4}
                      emph={emph}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {remaining > 0 && (
            <div className="loadmore">
              <button type="button" className="btn btn-secondary btn-lg" onClick={loadMore}>
                Show {Math.min(PAGE_SIZE, remaining)} more
              </button>
            </div>
          )}

          {total > 0 && (
            <p className="mt-12 text-center text-fg-muted">
              Can’t find a product?{" "}
              <button type="button" className="link-inline" onClick={requestProduct}>
                Send us a request
              </button>
            </p>
          )}
        </section>
      </div>
    </CatalogContext.Provider>
  );
}
