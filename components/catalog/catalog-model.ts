/**
 * Pure catalogue model shared by the /medicines client components: URL params
 * ⇄ state, search matching, facet counting and sorting. No React, no server
 * imports (CatalogItem is a type-only import; lib/search-text is pure), so it
 * is safe on both sides and trivially testable.
 */
import type { CatalogItem } from "@/lib/catalog";
import { norm } from "@/lib/search-text";

export const PAGE_SIZE = 48;
export const VIEW_STORAGE_KEY = "meridian.catalogue.view.v1";

export type Avail = CatalogItem["availability"];
export type SortKey = "recommended" | "name-asc" | "name-desc" | "molecule" | "stock";
export type ViewMode = "grid" | "list";
/** Multi-select facet groups (category is single-select and lives in the category bar). */
export type FacetKey = "molecule" | "form" | "avail" | "strength";
export type Dim = "category" | FacetKey;

export type Filters = {
  q: string;
  category: string; // "" = all products
  molecule: string[];
  form: string[];
  avail: Avail[];
  strength: string[];
};

/** Raw URL params: ?q=&category=&molecule=a,b&form=&avail=&strength=&sort=&view=&show= */
export type CatalogParams = {
  q?: string;
  category?: string;
  molecule?: string;
  form?: string;
  avail?: string;
  strength?: string;
  sort?: string;
  view?: string;
  show?: string;
};

export const PARAM_KEYS = ["q", "category", "molecule", "form", "avail", "strength", "sort", "view", "show"] as const;

export type CategoryLite = { slug: string; name: string; blurb: string | null; count: number };

export const SORTS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "molecule", label: "Molecule A–Z" },
  { value: "stock", label: "In stock first" },
];

export const AVAIL_OPTIONS: { value: Avail; label: string }[] = [
  { value: "in-stock", label: "In stock" },
  { value: "made-to-order", label: "Made to order" },
];
export const AVAIL_LABEL: Record<Avail, string> = { "in-stock": "In stock", "made-to-order": "Made to order" };

export const EMPTY_FILTERS: Filters = { q: "", category: "", molecule: [], form: [], avail: [], strength: [] };

/** Placeholder values the catalogue stores in the strengths column that are not strengths. */
const NOT_A_STRENGTH = /^(on request|-|–|n\/?a|tba)$/i;
export const isRealStrength = (s: string) => !!s.trim() && !NOT_A_STRENGTH.test(s.trim());

/* ------------------------------------------------ strength emphasis */

/** Leading number of a strength: "200 mg" → "200", "0.5 mg" → "0.5", "On request" → "". */
const leadingNumber = (s: string) => /^\s*(\d+(?:\.\d+)?)/.exec(s)?.[1] ?? "";

/**
 * The set the card, row and table use to surface strengths the buyer asked
 * for: the norm()'d active strength filters ("200mg") plus the digit-bearing
 * search tokens ("200", "200mg"). Build it once per catalogue render.
 */
export const strengthEmphasis = (strength: string[], tokens: string[]): Set<string> =>
  new Set([...strength.map(norm), ...tokens.filter((t) => /\d/.test(t))]);

/**
 * Does this strength match the buyer's strength filter or a number they typed?
 * The leading number must EQUAL a token (never includes()), so typing "20" does
 * not also flag 120 mg and 200 mg.
 */
export const isEmphStrength = (s: string, emph: ReadonlySet<string>) => {
  const n = leadingNumber(s);
  return emph.has(norm(s)) || (n !== "" && emph.has(n));
};

/** Matched strengths first (so they are not hidden in "+N"), the rest in stored order. */
export function orderStrengths(strengths: string[], emph?: ReadonlySet<string>): string[] {
  if (!emph?.size) return strengths;
  const hit = strengths.filter((s) => isEmphStrength(s, emph));
  return [...hit, ...strengths.filter((s) => !isEmphStrength(s, emph))];
}

/** orderStrengths, with each strength tagged so a matched chip can be marked (.is-match). */
export function tagStrengths(strengths: string[], emph?: ReadonlySet<string>): { value: string; match: boolean }[] {
  const tagged = strengths.map((value) => ({ value, match: !!emph?.size && isEmphStrength(value, emph) }));
  return [...tagged.filter((t) => t.match), ...tagged.filter((t) => !t.match)];
}

/* ------------------------------------------------------------ search */

// The normaliser and tokenizer live in lib/search-text, shared with the header
// search and Paste-a-list; re-exported so existing imports keep working.
export { norm, tokenize } from "@/lib/search-text";

/* ---------------------------------------------------------- universe */

export type Option = { value: string; total: number };

export type Universe = {
  /** Normalised search text per item id (name, molecule, form, strengths, category). */
  hay: Map<string, string>;
  molecules: Option[]; // A–Z
  forms: Option[]; // most products first
  strengths: Option[]; // by unit, then value
};

const unitRank: Record<string, number> = { mcg: 0, "µg": 0, mg: 1, g: 2, "mg/ml": 3, ml: 4, iu: 5, "%": 6 };

/** Order strengths as a pharmacist would: by unit (mcg, mg, g, mg/ml…), then numerically. */
export function strengthCompare(a: string, b: string): number {
  const pa = /^(\d+(?:\.\d+)?)\s*(.*)$/.exec(a.trim());
  const pb = /^(\d+(?:\.\d+)?)\s*(.*)$/.exec(b.trim());
  if (!pa || !pb) return pa ? -1 : pb ? 1 : a.localeCompare(b);
  const ua = pa[2].toLowerCase();
  const ub = pb[2].toLowerCase();
  const ra = unitRank[ua] ?? 9;
  const rb = unitRank[ub] ?? 9;
  return ra - rb || ua.localeCompare(ub) || Number(pa[1]) - Number(pb[1]);
}

function tally(values: Iterable<string>): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

export function buildUniverse(items: CatalogItem[]): Universe {
  const hay = new Map<string, string>();
  for (const it of items) {
    hay.set(
      it.id,
      norm([it.name, it.molecule ?? "", it.form ?? "", it.strengths.join(" "), it.category?.name ?? ""].join(" ")),
    );
  }
  const toOptions = (m: Map<string, number>) => [...m].map(([value, total]) => ({ value, total }));
  const molecules = toOptions(tally(items.flatMap((i) => (i.molecule ? [i.molecule] : [])))).sort((a, b) =>
    a.value.localeCompare(b.value),
  );
  const forms = toOptions(tally(items.flatMap((i) => (i.form ? [i.form] : [])))).sort(
    (a, b) => b.total - a.total || a.value.localeCompare(b.value),
  );
  const strengths = toOptions(tally(items.flatMap((i) => i.strengths.filter(isRealStrength)))).sort((a, b) =>
    strengthCompare(a.value, b.value),
  );
  return { hay, molecules, forms, strengths };
}

/* ------------------------------------------------------ URL ⇄ state */

export type CatalogState = { filters: Filters; sort: SortKey; view: ViewMode | null; show: number };

const first = (v: unknown): string | undefined =>
  typeof v === "string" ? v : Array.isArray(v) && typeof v[0] === "string" ? v[0] : undefined;

/** Keep only the known params, first value of each (Next can hand us arrays). */
export function cleanParams(raw: Record<string, unknown> | null | undefined): CatalogParams {
  const out: CatalogParams = {};
  if (!raw) return out;
  for (const k of PARAM_KEYS) {
    const v = first(raw[k]);
    if (v !== undefined && v !== "") out[k] = v;
  }
  return out;
}

export function paramsFromSearch(sp: { get(name: string): string | null }): CatalogParams {
  const out: CatalogParams = {};
  for (const k of PARAM_KEYS) {
    const v = sp.get(k);
    if (v) out[k] = v;
  }
  return out;
}

const splitList = (v?: string) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Map raw values onto the catalogue's canonical spelling; unknown values are dropped. */
function canon(raw: string[], options: string[], key: (s: string) => string = (s) => s.toLowerCase()): string[] {
  const byKey = new Map(options.map((o) => [key(o), o]));
  const out: string[] = [];
  for (const r of raw) {
    const hit = byKey.get(key(r));
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out;
}

export function parseParams(p: CatalogParams, u: Universe, categories: CategoryLite[]): CatalogState {
  const cat = p.category ? categories.find((c) => c.slug.toLowerCase() === p.category!.toLowerCase()) : undefined;
  const sort = SORTS.some((s) => s.value === p.sort) ? (p.sort as SortKey) : "recommended";
  const view = p.view === "grid" || p.view === "list" ? p.view : null;
  const n = Number.parseInt(p.show ?? "", 10);
  const show = Number.isFinite(n) ? Math.min(Math.max(n, PAGE_SIZE), 5000) : PAGE_SIZE;
  return {
    filters: {
      q: (p.q ?? "").slice(0, 120),
      category: cat?.slug ?? "",
      molecule: canon(splitList(p.molecule), u.molecules.map((o) => o.value)),
      form: canon(splitList(p.form), u.forms.map((o) => o.value)),
      avail: canon(splitList(p.avail), AVAIL_OPTIONS.map((o) => o.value)) as Avail[],
      strength: canon(splitList(p.strength), u.strengths.map((o) => o.value), (s) => norm(s)),
    },
    sort,
    view,
    show,
  };
}

const enc = (s: string) => encodeURIComponent(s).replace(/%20/g, "+");

/**
 * Build "?…" for the given state, keeping any foreign params (utm_* etc.) that
 * are already in `current`. Lists are comma-joined: ?molecule=a,b
 */
export function buildSearch(current: string, s: CatalogState): string {
  const parts: string[] = [];
  new URLSearchParams(current).forEach((v, k) => {
    if (!(PARAM_KEYS as readonly string[]).includes(k)) parts.push(`${enc(k)}=${enc(v)}`);
  });
  const f = s.filters;
  const q = f.q.trim();
  if (q) parts.push(`q=${enc(q)}`);
  if (f.category) parts.push(`category=${enc(f.category)}`);
  (["molecule", "form", "avail", "strength"] as const).forEach((k) => {
    if (f[k].length) parts.push(`${k}=${f[k].map(enc).join(",")}`);
  });
  if (s.sort !== "recommended") parts.push(`sort=${s.sort}`);
  if (s.view) parts.push(`view=${s.view}`);
  if (s.show > PAGE_SIZE) parts.push(`show=${s.show}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

/** Canonical form for comparing two query strings. */
export const normalizeSearch = (s: string) => new URLSearchParams(s).toString();

/* ---------------------------------------------------- filter + facets */

export function matchesQuery(it: CatalogItem, tokens: string[], u: Universe): boolean {
  if (!tokens.length) return true;
  const hay = u.hay.get(it.id) ?? "";
  return tokens.every((t) => hay.includes(t));
}

/** Does the item pass every active filter, optionally ignoring one dimension? */
export function passes(it: CatalogItem, f: Filters, skip?: Dim): boolean {
  if (skip !== "category" && f.category && it.category?.slug !== f.category) return false;
  if (skip !== "molecule" && f.molecule.length && !(it.molecule && f.molecule.includes(it.molecule))) return false;
  if (skip !== "form" && f.form.length && !(it.form && f.form.includes(it.form))) return false;
  if (skip !== "avail" && f.avail.length && !f.avail.includes(it.availability)) return false;
  if (skip !== "strength" && f.strength.length && !it.strengths.some((s) => f.strength.includes(s))) return false;
  return true;
}

export type FacetCounts = {
  category: Map<string, number>;
  /** Products matching everything except the category (the "All products" row). */
  categoryAll: number;
  molecule: Map<string, number>;
  form: Map<string, number>;
  avail: Map<string, number>;
  strength: Map<string, number>;
};

/**
 * Live counts for every option. Each group's counts reflect the OTHER active
 * filters (so picking "Tablets" doesn't zero out "Capsules").
 */
export function facetCounts(pool: CatalogItem[], f: Filters): FacetCounts {
  const out: FacetCounts = {
    category: new Map(),
    categoryAll: 0,
    molecule: new Map(),
    form: new Map(),
    avail: new Map(),
    strength: new Map(),
  };
  const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const it of pool) {
    const c = !f.category || it.category?.slug === f.category;
    const m = !f.molecule.length || (!!it.molecule && f.molecule.includes(it.molecule));
    const fo = !f.form.length || (!!it.form && f.form.includes(it.form));
    const a = !f.avail.length || f.avail.includes(it.availability);
    const s = !f.strength.length || it.strengths.some((x) => f.strength.includes(x));
    if (m && fo && a && s) {
      out.categoryAll++;
      if (it.category) inc(out.category, it.category.slug);
    }
    if (c && fo && a && s && it.molecule) inc(out.molecule, it.molecule);
    if (c && m && a && s && it.form) inc(out.form, it.form);
    if (c && m && fo && s) inc(out.avail, it.availability);
    if (c && m && fo && a) for (const x of it.strengths) inc(out.strength, x);
  }
  return out;
}

const byName = (a: CatalogItem, b: CatalogItem) =>
  a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });

export function sortItems(items: CatalogItem[], sort: SortKey): CatalogItem[] {
  const out = [...items];
  switch (sort) {
    case "name-asc":
      return out.sort(byName);
    case "name-desc":
      return out.sort((a, b) => byName(b, a));
    case "molecule":
      return out.sort(
        (a, b) => (a.molecule ?? "￿").localeCompare(b.molecule ?? "￿") || byName(a, b),
      );
    case "stock":
      return out.sort(
        (a, b) =>
          (a.availability === "in-stock" ? 0 : 1) - (b.availability === "in-stock" ? 0 : 1) ||
          a.sort_order - b.sort_order ||
          byName(a, b),
      );
    default:
      return out.sort((a, b) => a.sort_order - b.sort_order || byName(a, b));
  }
}

/** Number of active facet values incl. category (drives "Filters (n)"). q is search, not a filter. */
export const activeFilterCount = (f: Filters) =>
  (f.category ? 1 : 0) + f.molecule.length + f.form.length + f.avail.length + f.strength.length;

export const hasAnyFilter = (f: Filters) => activeFilterCount(f) > 0 || f.q.trim().length > 0;

export const toggleValue = <T extends string>(list: T[], v: T): T[] =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
