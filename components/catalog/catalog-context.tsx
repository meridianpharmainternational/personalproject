"use client";

import { createContext, useContext } from "react";
import type { CategoryLite } from "@/components/catalog/catalog-model";

/**
 * With exactly one molecule selected: its products within the active category
 * (if any), counted as generateMetadata counts them for the landing page's
 * <title>, so the head and the <title> agree.
 */
export type MoleculeScope = {
  count: number;
  /** Categories the molecule's products span. */
  categoryCount: number;
  /** Distinct dosage forms, in catalogue order. */
  forms: string[];
};

/**
 * What the page-head pieces (breadcrumb/title and the 56px search field) need
 * from <MedicineCatalog>, which owns all catalogue state. The page head is
 * rendered by the server page and handed to MedicineCatalog as `head`, so
 * these client islands sit inside its provider.
 */
export type CatalogHeadContext = {
  categories: CategoryLite[];
  /** Active category slug ("" = all products). */
  category: string;
  /** Selected molecules (filters.molecule, in the catalogue's spelling). */
  molecule: string[];
  /**
   * With exactly one molecule selected: its products within the active
   * category (if any), counted as generateMetadata counts them; null otherwise.
   */
  moleculeScope: MoleculeScope | null;
  q: string;
  setQuery: (q: string) => void;
  /** Push any pending URL update now (Enter in the search field). */
  flushUrl: () => void;
  total: number;
  categoryCount: number;
  moleculeCount: number;
  /** Distinct molecules per category slug. */
  moleculesByCategory: Map<string, number>;
  /** Products matching the current search + filters. */
  resultCount: number;
  /**
   * When no product matched the query as typed and the results come from a
   * relaxed search (lib/search-text relaxTokens), the query it ran instead
   * (Relaxed.query), so the search field can say so (never correct silently);
   * null otherwise.
   */
  correctedTo: string | null;
};

export const CatalogContext = createContext<CatalogHeadContext | null>(null);

export function useCatalogHead(): CatalogHeadContext {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("Catalogue head components must be rendered inside <MedicineCatalog head={…}>.");
  return ctx;
}
