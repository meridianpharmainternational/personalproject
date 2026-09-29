"use client";

import { useCallback, useEffect, useState } from "react";
// Same normaliser and tokenizer the /medicines catalogue uses, so "100mg",
// "100 mg" and "Cenforce-D" match identically in the header search and on the
// catalogue page.
import { norm, tokenize, relaxTokens } from "@/lib/search-text";

/** One product in the lean search index served by /api/catalog-index. */
export type IndexItem = {
  id: string;
  name: string;
  molecule: string | null;
  form: string | null;
  strengths: string[];
  category: { slug: string; name: string } | null;
  availability: "in-stock" | "made-to-order";
  image: string | null;
};

/** Only a good (non-empty) index is ever cached; failures are retried. */
let cache: IndexItem[] | null = null;
let inflight: Promise<IndexItem[] | null> | null = null;
let lastFailure = 0;

/** Minimum gap between automatic retries (explicit retry() ignores it). */
const RETRY_COOLDOWN_MS = 3000;

/**
 * Loads the index once per page session; shared by every search box.
 * Resolves to null when the index could not be loaded (network error, non-OK
 * response, or an empty/invalid body). Nothing is cached in that case, so the
 * next call tries again.
 */
export function loadCatalogIndex(): Promise<IndexItem[] | null> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/catalog-index")
      .then((r) => (r.ok ? (r.json() as Promise<unknown>) : null))
      .then((d) => (Array.isArray(d) && d.length > 0 ? (cache = d as IndexItem[]) : null))
      .catch(() => null)
      .then((d) => {
        if (!d) {
          inflight = null;
          lastFailure = Date.now();
        }
        return d;
      });
  }
  return inflight;
}

export type CatalogIndexStatus = "idle" | "loading" | "ready" | "error";

export type CatalogIndexState = {
  /** The index once loaded; null while idle, loading or unavailable. */
  index: IndexItem[] | null;
  /**
   * "error" means the last attempt failed: show "Search is temporarily
   * unavailable" (not "No products match"), and don't classify pasted lines.
   */
  status: CatalogIndexStatus;
  /** Try loading again now, e.g. from a "Try again" button. */
  retry: () => void;
};

/**
 * Loads the index once `enabled` (e.g. after first focus) and reports whether
 * it is loading, ready or unavailable. While unavailable, enabling again, the
 * next focus anywhere on the page, or the browser coming back online retries.
 */
export function useCatalogIndexState(enabled: boolean): CatalogIndexState {
  const [data, setData] = useState<IndexItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || data) return;
    let alive = true;
    loadCatalogIndex().then((d) => {
      if (!alive) return;
      if (d) {
        setData(d);
        setFailed(false);
      } else {
        setFailed(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [enabled, data, attempt]);

  // While the index is unavailable, the next focus or a reconnect retries.
  useEffect(() => {
    if (!enabled || data || !failed) return;
    const onFocus = () => {
      if (Date.now() - lastFailure >= RETRY_COOLDOWN_MS) setAttempt((n) => n + 1);
    };
    const onOnline = () => setAttempt((n) => n + 1);
    document.addEventListener("focusin", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("focusin", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [enabled, data, failed]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  const status: CatalogIndexStatus = data ? "ready" : failed ? "error" : enabled ? "loading" : "idle";
  return { index: data, status, retry };
}

/**
 * Returns the index once `enabled` (e.g. after first focus); null while loading
 * or while the index is unavailable (never an empty "loaded" list). Use
 * useCatalogIndexState to tell those two apart.
 */
export function useCatalogIndex(enabled: boolean): IndexItem[] | null {
  return useCatalogIndexState(enabled).index;
}

export type SearchResult = {
  products: IndexItem[];
  molecules: { name: string; count: number }[];
  categories: { slug: string; name: string; count: number }[];
  total: number;
  /**
   * Set when the query as typed matched nothing and a shortened spelling was
   * searched instead (e.g. "ivermectin" for "ivermectine"). Show it
   * ('Showing results for “ivermectin”'): never correct silently.
   */
  correctedTo: string | null;
};

const EMPTY: SearchResult = { products: [], molecules: [], categories: [], total: 0, correctedTo: null };

/** Normalised search text, built once per loaded index. */
type Prepared = {
  rows: { item: IndexItem; name: string; mol: string; hay: string }[];
  /** Every row's hay, in row order, for the relaxTokens() fallback. */
  hays: string[];
  /** Every molecule with its product count (count = products with that molecule). */
  molecules: { name: string; n: string; count: number }[];
  /** Every category with its product count, in first-seen order. */
  categories: { slug: string; name: string; n: string; count: number }[];
};

const prepared = new WeakMap<IndexItem[], Prepared>();

function prepare(index: IndexItem[]): Prepared {
  const hit = prepared.get(index);
  if (hit) return hit;

  const rows = index.map((it) => ({
    item: it,
    name: norm(it.name),
    mol: norm(it.molecule ?? ""),
    // Same fields and order as the catalogue's buildUniverse(), so counts agree.
    hay: norm([it.name, it.molecule ?? "", it.form ?? "", it.strengths.join(" "), it.category?.name ?? ""].join(" ")),
  }));

  const molMap = new Map<string, { name: string; n: string; count: number }>();
  const catMap = new Map<string, { slug: string; name: string; n: string; count: number }>();
  for (const r of rows) {
    const m = r.item.molecule;
    if (m) {
      const e = molMap.get(m) ?? { name: m, n: r.mol, count: 0 };
      e.count++;
      molMap.set(m, e);
    }
    const c = r.item.category;
    if (c) {
      const e = catMap.get(c.slug) ?? { slug: c.slug, name: c.name, n: norm(c.name), count: 0 };
      e.count++;
      catMap.set(c.slug, e);
    }
  }

  const out: Prepared = {
    rows,
    hays: rows.map((r) => r.hay),
    molecules: [...molMap.values()],
    categories: [...catMap.values()],
  };
  prepared.set(index, out);
  return out;
}

/**
 * Token-AND search across name, molecule, form, strengths and category, using
 * the catalogue's normaliser and tokenizer (case, accents, punctuation,
 * "100 mg" = "100mg", single letters ignored). A query with no tokens (e.g. a
 * lone letter) is no query and returns no results.
 * Ranking: the whole query (single letters included, so "Cenforce D" puts
 * Cenforce-D first) as the exact name → as a name prefix → the tokens as a
 * name prefix → molecule prefix → word-start in name → substring.
 * Spelling tolerance: a search that matches no product is retried once with
 * each unmatched long word (7+ letters) shortened by 1-2 trailing letters
 * ("ivermectine" → "ivermectin", see relaxTokens). If that finds products,
 * they are returned with `correctedTo` set to the query actually searched, so
 * the caller can say 'Showing results for “ivermectin”'; otherwise the strict
 * (empty) result comes back with `correctedTo: null`.
 */
export function searchCatalog(
  index: IndexItem[],
  query: string,
  limits = { products: 6, molecules: 4, categories: 3 },
): SearchResult {
  const tokens = tokenize(query);
  if (!tokens.length) return EMPTY;
  const p = prepare(index);

  /** One token-AND pass; `whole` is the normalised query for the exact-name ranks. */
  const run = (tokens: string[], whole: string): Omit<SearchResult, "correctedTo"> => {
    const q = tokens.join(" ");

    const scored: { item: IndexItem; score: number }[] = [];
    for (const r of p.rows) {
      if (!tokens.every((t) => r.hay.includes(t))) continue;
      const score =
        r.name === whole
          ? 0
          : r.name.startsWith(whole)
            ? 1
            : r.name.startsWith(q)
              ? 2
              : r.mol.startsWith(q)
                ? 3
                : r.name.split(" ").some((w) => w.startsWith(tokens[0]))
                  ? 4
                  : 5;
      scored.push({ item: r.item, score });
    }
    scored.sort((a, b) => a.score - b.score || a.item.name.localeCompare(b.item.name));

    const molecules = p.molecules
      .filter((m) => tokens.every((t) => m.n.includes(t)))
      .sort((a, b) => (a.n.startsWith(q) ? 0 : 1) - (b.n.startsWith(q) ? 0 : 1) || b.count - a.count)
      .slice(0, limits.molecules)
      .map(({ name, count }) => ({ name, count }));

    const categories = p.categories
      .filter((c) => tokens.every((t) => c.n.includes(t)))
      .slice(0, limits.categories)
      .map(({ slug, name, count }) => ({ slug, name, count }));

    return {
      products: scored.slice(0, limits.products).map((s) => s.item),
      molecules,
      categories,
      total: scored.length,
    };
  };

  const strict = run(tokens, norm(query));
  if (strict.total > 0) return { ...strict, correctedTo: null };

  const relaxed = relaxTokens(tokens, p.hays);
  if (relaxed) {
    const loose = run(relaxed.tokens, relaxed.query);
    return { ...loose, correctedTo: relaxed.query };
  }
  return { ...strict, correctedTo: null };
}

/**
 * Split text so the first query token can be wrapped in <mark>. Works on the
 * raw text: takes the first typed word that is a search token (a lone letter
 * isn't, see tokenize), tries it as-is, then its normalised form
 * (e.g. "(cenforce" → "cenforce"). No mark when neither appears verbatim.
 */
export function highlightParts(text: string, query: string): { text: string; match: boolean }[] {
  const raw =
    query
      .trim()
      .split(/\s+/)
      .find((w) => tokenize(w).length > 0) ?? "";
  if (!raw) return [{ text, match: false }];
  const lower = text.toLowerCase();
  let first = raw;
  let idx = lower.indexOf(raw.toLowerCase());
  if (idx < 0) {
    first = tokenize(raw)[0] ?? "";
    idx = first ? lower.indexOf(first) : -1;
  }
  if (idx < 0) return [{ text, match: false }];
  return [
    { text: text.slice(0, idx), match: false },
    { text: text.slice(idx, idx + first.length), match: true },
    { text: text.slice(idx + first.length), match: false },
  ].filter((p) => p.text);
}
