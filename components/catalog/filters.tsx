"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import {
  AVAIL_OPTIONS,
  strengthCompare,
  type CategoryLite,
  type FacetCounts,
  type FacetKey,
  type Filters,
  type Universe,
} from "@/components/catalog/catalog-model";

const MOLECULES_COLLAPSED = 8;
const STRENGTHS_COLLAPSED = 12;

type Props = {
  /** Distinguishes the sidebar and sheet instances (radio names, ids). */
  variant: "sidebar" | "sheet";
  filters: Filters;
  universe: Universe;
  counts: FacetCounts;
  onToggle: (key: FacetKey, value: string) => void;
  /** Sheet only: Category as radio rows (on desktop the category bar is the selector). */
  categories?: CategoryLite[];
  onCategory?: (slug: string) => void;
};

/**
 * Filter groups: [Category (sheet only)] · Molecule · Dosage form ·
 * Availability · Strength. Counts reflect the other active filters; options
 * with no results are disabled (never hidden) unless they are checked, so they
 * can always be unchecked.
 */
export function FilterGroups({ variant, filters, universe, counts, onToggle, categories, onCategory }: Props) {
  return (
    <div>
      {variant === "sheet" && categories && onCategory && (
        <Group title="Category" selected={filters.category ? 1 : 0}>
          <div role="radiogroup" aria-label="Category">
            <CheckRow
              type="radio"
              name={`${variant}-category`}
              checked={!filters.category}
              count={counts.categoryAll}
              onChange={() => onCategory("")}
            >
              All products
            </CheckRow>
            {categories.map((c) => (
              <CheckRow
                key={c.slug}
                type="radio"
                name={`${variant}-category`}
                checked={filters.category === c.slug}
                count={counts.category.get(c.slug) ?? 0}
                onChange={() => onCategory(c.slug)}
              >
                {c.name}
              </CheckRow>
            ))}
          </div>
        </Group>
      )}

      <MoleculeGroup filters={filters} universe={universe} counts={counts} onToggle={onToggle} />

      {universe.forms.length > 0 && (
        <Group title="Dosage form" selected={filters.form.length}>
          <div role="group" aria-label="Dosage form">
            {universe.forms.map((o) => (
              <CheckRow
                key={o.value}
                checked={filters.form.includes(o.value)}
                count={counts.form.get(o.value) ?? 0}
                onChange={() => onToggle("form", o.value)}
              >
                {o.value}
              </CheckRow>
            ))}
          </div>
        </Group>
      )}

      <Group title="Availability" selected={filters.avail.length}>
        <div role="group" aria-label="Availability">
          {AVAIL_OPTIONS.map((o) => (
            <CheckRow
              key={o.value}
              checked={filters.avail.includes(o.value)}
              count={counts.avail.get(o.value) ?? 0}
              onChange={() => onToggle("avail", o.value)}
            >
              {o.label}
            </CheckRow>
          ))}
        </div>
      </Group>

      <StrengthGroup filters={filters} universe={universe} counts={counts} onToggle={onToggle} />
    </div>
  );
}

/* -------------------------------------------------------------- groups */

function Group({ title, selected, children }: { title: string; selected: number; children: ReactNode }) {
  return (
    <details className="filter-group" open>
      <summary>
        <span>
          {title}
          {selected > 0 && <span className="ml-2 font-mono text-xs font-medium text-fg-muted">{selected} selected</span>}
        </span>
      </summary>
      <div className="filter-group-body">{children}</div>
    </details>
  );
}

type GroupProps = Pick<Props, "filters" | "universe" | "counts" | "onToggle">;

function MoleculeGroup({ filters, universe, counts, onToggle }: GroupProps) {
  const findId = useId();
  const [find, setFind] = useState("");
  const [all, setAll] = useState(false);
  const selected = filters.molecule;
  const term = find.trim().toLowerCase();
  const total = universe.molecules.length;

  const list = useMemo(() => {
    if (term) return universe.molecules.filter((o) => o.value.toLowerCase().includes(term));
    if (all) return universe.molecules; // A–Z
    // Collapsed: the 8 with the most matching products (live), plus anything checked.
    const live = (v: string) => counts.molecule.get(v) ?? 0;
    const top = [...universe.molecules]
      .sort((a, b) => live(b.value) - live(a.value) || b.total - a.total || a.value.localeCompare(b.value))
      .slice(0, MOLECULES_COLLAPSED);
    const extra = universe.molecules.filter((o) => selected.includes(o.value) && !top.includes(o));
    return [...top, ...extra];
  }, [term, all, universe.molecules, counts.molecule, selected]);

  if (!total) return null;

  return (
    <Group title="Molecule" selected={selected.length}>
      {total > MOLECULES_COLLAPSED && (
        <div className="mb-2">
          <label htmlFor={findId} className="sr-only">
            Find a molecule
          </label>
          <input
            id={findId}
            type="search"
            className="input min-h-tap py-2"
            placeholder="Find a molecule"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            autoComplete="off"
          />
        </div>
      )}
      <div role="group" aria-label="Molecule">
        {list.map((o) => (
          <CheckRow
            key={o.value}
            checked={selected.includes(o.value)}
            count={counts.molecule.get(o.value) ?? 0}
            onChange={() => onToggle("molecule", o.value)}
          >
            {o.value}
          </CheckRow>
        ))}
        {term && list.length === 0 && <p className="py-2 text-sm text-fg-muted">No molecule matches “{find.trim()}”.</p>}
      </div>
      {!term && total > MOLECULES_COLLAPSED && (
        <button type="button" className="btn btn-ghost btn-sm -ml-2.5 mt-1" aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? "Show fewer" : `Show all ${total}`}
        </button>
      )}
    </Group>
  );
}

function StrengthGroup({ filters, universe, counts, onToggle }: GroupProps) {
  const [all, setAll] = useState(false);
  const selected = filters.strength;
  const total = universe.strengths.length;

  const list = useMemo(() => {
    if (all || total <= STRENGTHS_COLLAPSED) return universe.strengths;
    // Most common strengths for the current results, shown in dose order.
    const live = (v: string) => counts.strength.get(v) ?? 0;
    const top = [...universe.strengths]
      .sort((a, b) => live(b.value) - live(a.value) || b.total - a.total)
      .slice(0, STRENGTHS_COLLAPSED);
    const keep = new Set([...top.map((o) => o.value), ...selected]);
    return universe.strengths.filter((o) => keep.has(o.value)).sort((a, b) => strengthCompare(a.value, b.value));
  }, [all, total, universe.strengths, counts.strength, selected]);

  if (!total) return null;

  return (
    <Group title="Strength" selected={selected.length}>
      <div role="group" aria-label="Strength">
        {list.map((o) => (
          <CheckRow
            key={o.value}
            mono
            checked={selected.includes(o.value)}
            count={counts.strength.get(o.value) ?? 0}
            onChange={() => onToggle("strength", o.value)}
          >
            {o.value}
          </CheckRow>
        ))}
      </div>
      {total > STRENGTHS_COLLAPSED && (
        <button type="button" className="btn btn-ghost btn-sm -ml-2.5 mt-1" aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? "Show most common" : `Show all ${total}`}
        </button>
      )}
    </Group>
  );
}

/* ----------------------------------------------------------------- row */

function CheckRow({
  type = "checkbox",
  name,
  checked,
  count,
  mono = false,
  onChange,
  children,
}: {
  type?: "checkbox" | "radio";
  name?: string;
  checked: boolean;
  count: number;
  mono?: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="check">
      <input type={type} name={name} checked={checked} disabled={count === 0 && !checked} onChange={onChange} />
      <span className={`min-w-0 flex-1 break-words${mono ? " font-mono text-sm" : ""}`}>{children}</span>
      <span className="count">{count}</span>
    </label>
  );
}
