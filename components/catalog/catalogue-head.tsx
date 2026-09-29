"use client";

import { useId, useRef } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { useCatalogHead, type CatalogHeadContext } from "@/components/catalog/catalog-context";
import { tokenize } from "@/lib/search-text";

/** id of the page <h1>; focus lands here from "Back to top". */
export const CATALOGUE_TITLE_ID = "catalogue-title";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * With exactly one molecule selected: that molecule's products within the
 * active category (if any), counted as generateMetadata counts them for the
 * landing page's <title>.
 */
type MoleculeScope = { count: number; categoryCount: number; forms: string[] };

/**
 * The molecule fields are optional here, so without them the head falls back
 * to the catalogue / category head.
 */
type HeadingContext = CatalogHeadContext & { molecule?: string[]; moleculeScope?: MoleculeScope | null };

/**
 * Breadcrumb, <h1> and live-count meta line for the catalogue page head. Client
 * island so the title follows the active category and molecule when they change
 * in place (chip remove, mobile filter sheet, "Clear all") without a server
 * round trip. The three landing pages each get their own head:
 * - /medicines: "Product catalogue", whole-catalogue counts;
 * - ?category=: the category name, its counts and blurb;
 * - ?molecule= (one molecule, optionally within a category): the molecule name,
 *   its product count, the categories it spans and its dosage forms.
 * The <h1> is set at the h2 size so the first row of products shows above the fold.
 */
export function CatalogueHeading() {
  const ctx: HeadingContext = useCatalogHead();
  const { categories, category, total, categoryCount, moleculeCount, moleculesByCategory, moleculeScope } = ctx;
  const cat = categories.find((c) => c.slug === category);
  const mol =
    ctx.molecule?.length === 1 && moleculeScope ? { name: ctx.molecule[0], ...moleculeScope } : undefined;

  let meta: string[];
  if (mol) {
    meta = [plural(mol.count, "product")];
    // Only worth a line item when the molecule spans several categories.
    if (!cat && mol.categoryCount > 1) meta.push(plural(mol.categoryCount, "category", "categories"));
    // Name up to three forms; beyond that just count them, so the line stays short.
    if (mol.forms.length) meta.push(mol.forms.length <= 3 ? mol.forms.join(", ") : plural(mol.forms.length, "form"));
  } else if (cat) {
    meta = [plural(cat.count, "product"), plural(moleculesByCategory.get(cat.slug) ?? 0, "molecule")];
  } else {
    meta = [plural(total, "product"), plural(categoryCount, "category", "categories"), plural(moleculeCount, "molecule")];
  }

  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="crumbs">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>
            {cat || mol ? <Link href="/medicines">Catalogue</Link> : <span aria-current="page">Catalogue</span>}
          </li>
          {cat && (
            <li>
              {mol ? (
                <Link href={`/medicines?category=${encodeURIComponent(cat.slug)}`}>{cat.name}</Link>
              ) : (
                <span aria-current="page">{cat.name}</span>
              )}
            </li>
          )}
          {mol && (
            <li>
              <span aria-current="page">{mol.name}</span>
            </li>
          )}
        </ol>
      </nav>
      <h1 id={CATALOGUE_TITLE_ID} tabIndex={-1} className="mt-2 break-words text-h2 lg:mt-3">
        {mol?.name ?? cat?.name ?? "Product catalogue"}
      </h1>
      <p className="kicker mt-4">{meta.join(" · ")}</p>
      {/* The blurb describes the category, not the molecule, so a molecule head leaves it out. */}
      {!mol && cat?.blurb && <p className="lead mt-3">{cat.blurb}</p>}
    </>
  );
}

/**
 * The 56px catalogue search, bound to ?q=. Filters live as you type (token-AND
 * over name, molecule, form, strengths and category; "100mg" matches "100 mg").
 * Without JavaScript it is a plain GET form to /medicines. From lg it sits
 * beside the heading (the page head's grid), so it has no top margin there.
 */
export function CatalogueSearch() {
  // correctedTo is optional here, so the field help falls back to the plain count without it.
  const ctx: CatalogHeadContext & { correctedTo?: string | null } = useCatalogHead();
  const { q, setQuery, flushUrl, category, categories, total, resultCount, correctedTo } = ctx;
  const id = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const cat = categories.find((c) => c.slug === category);
  const scope = cat ? `${cat.name} (${cat.count} products)` : `all ${total} products`;
  // A lone letter filters nothing (see tokenize), so only a real query shows the live count.
  const searching = tokenize(q).length > 0;

  return (
    <form
      role="search"
      aria-label="Catalogue"
      action="/medicines"
      method="get"
      className="mt-4 max-w-2xl lg:mt-0"
      onSubmit={(e) => {
        e.preventDefault();
        flushUrl();
        // Close the on-screen keyboard on touch devices so the results are visible.
        if (window.matchMedia("(pointer: coarse)").matches) inputRef.current?.blur();
      }}
    >
      <label htmlFor={id} className="sr-only">
        Search {scope}
      </label>
      <div className="relative">
        <Search className="search-icon" aria-hidden />
        <input
          ref={inputRef}
          id={id}
          name="q"
          type="search"
          value={q}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Product or molecule"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-describedby={searching ? hintId : undefined}
          className="search-input h-14 bg-white text-md [&::-webkit-search-cancel-button]:appearance-none"
        />
        {q && (
          <button
            type="button"
            className="icon-btn icon-btn-bare absolute right-1.5 top-1.5"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            <X aria-hidden />
          </button>
        )}
      </div>
      {/* Only the live match count, while searching: a static hint would cost a line above the fold.
          A spelling-corrected search always says what it searched for (never correct silently). */}
      {searching && (
        <p id={hintId} className="field-help">
          {correctedTo ? `Showing results for “${correctedTo}”: ` : null}
          {resultCount} {resultCount === 1 ? "match" : "matches"} in {cat ? cat.name : "the catalogue"}
        </p>
      )}
      {cat && <input type="hidden" name="category" value={cat.slug} />}
    </form>
  );
}
