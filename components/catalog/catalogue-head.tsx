"use client";

import { useId, useRef } from "react";
import { Search, X } from "lucide-react";
import { useCatalogHead, type CatalogHeadContext } from "@/components/catalog/catalog-context";
import { tokenize } from "@/lib/search-text";

/** id of the catalogue <h1>. */
export const CATALOGUE_TITLE_ID = "catalogue-title";

/** The molecule fields are optional here, so without them the title falls back to the category or catalogue. */
type HeadingContext = CatalogHeadContext & { molecule?: string[]; moleculeScope?: unknown };

/**
 * The catalogue's <h1>: the selected molecule (exactly one), else the category,
 * else "Products". A client island so it follows filter changes made in place.
 */
export function CatalogueHeading() {
  const ctx: HeadingContext = useCatalogHead();
  const cat = ctx.categories.find((c) => c.slug === ctx.category);
  const mol = ctx.molecule?.length === 1 && ctx.moleculeScope ? ctx.molecule[0] : undefined;
  return (
    <h1 id={CATALOGUE_TITLE_ID} tabIndex={-1} className="break-words text-h2">
      {mol ?? cat?.name ?? "Products"}
    </h1>
  );
}

/**
 * The 56px catalogue search, bound to ?q=. Filters live as you type (token-AND
 * over name, molecule, form, strengths and category; "100mg" matches "100 mg").
 * Without JavaScript it is a plain GET form to /medicines. From lg it sits
 * beside the heading (the page head's grid), so it has no top margin there.
 */
export function CatalogueSearch() {
  // correctedTo is optional here; without it no field help shows.
  const ctx: CatalogHeadContext & { correctedTo?: string | null } = useCatalogHead();
  const { q, setQuery, flushUrl, category, categories, total, correctedTo } = ctx;
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
          aria-describedby={searching && correctedTo ? hintId : undefined}
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
      {/* Only a spelling-corrected search says anything here (never correct silently); the
          result count is in the filter row. */}
      {searching && correctedTo && (
        <p id={hintId} className="field-help">
          Showing results for “{correctedTo}”
        </p>
      )}
      {cat && <input type="hidden" name="category" value={cat.slug} />}
    </form>
  );
}
