"use client";

import {
  SORTS,
  type CategoryLite,
  type FacetCounts,
  type Filters,
  type SortKey,
  type Universe,
} from "@/components/catalog/catalog-model";

/**
 * The catalogue's one filter row: category, dosage form and sort as plain
 * dropdowns, then the result count and "Clear filters". Molecules are found
 * through the search box (and a molecule link sets that filter in the URL;
 * the heading names it and "Clear filters" removes it). Form only lists
 * options that still have products with the other filters, and a value that
 * is selected always stays listed.
 */
export function CatalogueFilters({
  categories,
  universe,
  counts,
  filters,
  sort,
  searching,
  countText,
  canClear,
  empty,
  onCategory,
  onForm,
  onSort,
  onClear,
}: {
  categories: CategoryLite[];
  universe: Universe;
  counts: FacetCounts;
  filters: Filters;
  sort: SortKey;
  /** A search is active, so the default sort reads "Best match". */
  searching: boolean;
  countText: string;
  canClear: boolean;
  /** No results: the empty state below has its own message and "Clear filters", so this row shows neither. */
  empty: boolean;
  onCategory: (slug: string) => void;
  onForm: (value: string) => void;
  onSort: (sort: SortKey) => void;
  onClear: () => void;
}) {
  const form = filters.form[0] ?? "";
  const forms = universe.forms.filter((o) => o.value === form || (counts.form.get(o.value) ?? 0) > 0);

  return (
    <div className="cat-filters">
      <div className="cat-filters-row" role="group" aria-label="Filter products">
        <select
          className="select"
          aria-label="Category"
          value={filters.category}
          onChange={(e) => onCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="select" aria-label="Dosage form" value={form} onChange={(e) => onForm(e.target.value)}>
          <option value="">All forms</option>
          {forms.map((o) => (
            <option key={o.value} value={o.value}>
              {o.value}
            </option>
          ))}
        </select>
        <select
          className="select cat-filters-sort"
          aria-label="Sort"
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {searching && s.value === "recommended" ? "Best match" : s.label}
            </option>
          ))}
        </select>
      </div>
      {!empty && (
        <div className="cat-filters-meta">
          <p className="results-count" aria-hidden="true">
            {countText}
          </p>
          {canClear && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
