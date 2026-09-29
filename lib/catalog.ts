import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { parseStrengths } from "@/lib/format";
import { medicineImageUrl } from "@/lib/storage";
import { esterWord } from "@/lib/search-text";
import type { Category, MedicineWithCategory } from "@/types/db";

/**
 * Public catalog reads (active medicines only), cached for 5 minutes and tagged
 * `catalog` — admin create/update/delete calls `revalidateTag(CATALOG_TAG)` so
 * edits show immediately. Errors are thrown INSIDE the cached function (so a
 * transient failure is never cached) and caught outside.
 *
 * On a failure the loaders fall back to the last copy this server instance
 * read successfully, so a brief outage after a cache miss (e.g. the first
 * request after an admin edit) keeps serving the catalogue instead of an empty
 * site. Only when there is no earlier copy do they degrade: by default to
 * empty results (pages render their empty state), or, with `{ strict: true }`,
 * by throwing.
 */
export const CATALOG_TAG = "catalog";

export type LoadOptions = {
  /**
   * Throw instead of returning empty results when the database is unreachable
   * and this instance holds no earlier copy. Use it on ISR/static renders (the
   * root layout, "/", "/about", "/api/catalog-index"): a render that throws
   * during background regeneration leaves Next serving the last good page,
   * rather than caching an empty catalogue for the next 5 minutes.
   */
  strict?: boolean;
};

const MED_SELECT = "*, category:categories(id, slug, name)";

const cachedCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const { data, error } = await createPublicClient()
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Category[];
  },
  ["catalog:categories:v2"],
  { tags: [CATALOG_TAG], revalidate: 300 },
);

const cachedMedicines = unstable_cache(
  async (): Promise<MedicineWithCategory[]> => {
    const { data, error } = await createPublicClient()
      .from("medicines")
      .select(MED_SELECT)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as MedicineWithCategory[];
  },
  ["catalog:medicines:v2"],
  { tags: [CATALOG_TAG], revalidate: 300 },
);

// Last successful reads in this server instance (public, active-only data).
let lastCategories: Category[] | null = null;
let lastMedicines: MedicineWithCategory[] | null = null;

export async function getCategories({ strict = false }: LoadOptions = {}): Promise<Category[]> {
  try {
    const rows = await cachedCategories();
    lastCategories = rows;
    return rows;
  } catch (err) {
    console.error("[catalog] categories unavailable:", err);
    if (lastCategories) return lastCategories;
    if (strict) throw err;
    return [];
  }
}

export async function getMedicines({ strict = false }: LoadOptions = {}): Promise<MedicineWithCategory[]> {
  try {
    const rows = await cachedMedicines();
    lastMedicines = rows;
    return rows;
  } catch (err) {
    console.error("[catalog] medicines unavailable:", err);
    if (lastMedicines) return lastMedicines;
    if (strict) throw err;
    return [];
  }
}

/**
 * The active product with this id, or `null` when the catalogue loaded and has
 * no such product (the route answers 404). Throws when the catalogue can't be
 * loaded at all, so the route shows its error boundary (a 5xx crawlers retry)
 * instead of turning every product URL into a 404 during an outage.
 */
export async function getMedicineById(
  id: string,
): Promise<MedicineWithCategory | null> {
  const all = await getMedicines({ strict: true });
  return all.find((m) => m.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Lean projections (what we send to the browser)
// ---------------------------------------------------------------------------

/** Card/row/table data for the catalogue — no long descriptions. */
export type CatalogItem = {
  id: string;
  name: string;
  molecule: string | null;
  /** Ester or salt named by the description, e.g. "enanthate"; search text only, never displayed. */
  ester: string | null;
  form: string | null;
  strengths: string[];
  pack: string | null;
  moq: string | null;
  lead_time: string | null;
  availability: "in-stock" | "made-to-order";
  image: string | null;
  sort_order: number;
  category: { slug: string; name: string } | null;
};

export function toCatalogItem(m: MedicineWithCategory): CatalogItem {
  return {
    id: m.id,
    name: m.name,
    molecule: m.molecule,
    ester: esterWord(m.description),
    form: m.form,
    strengths: parseStrengths(m.strengths),
    pack: m.pack,
    moq: m.moq,
    lead_time: m.lead_time,
    availability: m.availability,
    image: medicineImageUrl(m.image_path),
    sort_order: m.sort_order,
    category: m.category ? { slug: m.category.slug, name: m.category.name } : null,
  };
}

export async function getCatalogItems(opts: LoadOptions = {}): Promise<CatalogItem[]> {
  return (await getMedicines(opts)).map(toCatalogItem);
}

const moleculeKey = (molecule: string | null | undefined) => molecule?.trim().toLowerCase() || null;

/**
 * The first `n` items of `list` without duplicate ids, preferring one product
 * per molecule: items whose molecule already appeared are held back and only
 * fill the slots left over, so a rail or related block never opens on several
 * brands of one salt.
 */
export function varied(list: CatalogItem[], n = 8): CatalogItem[] {
  const ids = new Set<string>();
  const molecules = new Set<string>();
  const first: CatalogItem[] = [];
  const rest: CatalogItem[] = [];
  for (const it of list) {
    if (ids.has(it.id)) continue;
    ids.add(it.id);
    const m = moleculeKey(it.molecule);
    if (m && molecules.has(m)) rest.push(it);
    else {
      if (m) molecules.add(m);
      first.push(it);
    }
  }
  return [...first, ...rest].slice(0, n);
}

// ---------------------------------------------------------------------------
// Aggregates (all counts come from the database, never hard-coded)
// ---------------------------------------------------------------------------

export type CategorySummary = Category & { count: number; topMolecules: string[] };
export type MoleculeCount = { name: string; count: number };

export type CatalogSummary = {
  total: number;
  categoryCount: number;
  moleculeCount: number;
  categories: CategorySummary[];
  molecules: MoleculeCount[]; // A–Z
  popularMolecules: MoleculeCount[]; // top 5 by product count
};

function tally(names: (string | null)[]): MoleculeCount[] {
  const map = new Map<string, number>();
  for (const n of names) {
    if (!n) continue;
    map.set(n, (map.get(n) ?? 0) + 1);
  }
  return [...map].map(([name, count]) => ({ name, count }));
}

export async function getCatalogSummary(opts: LoadOptions = {}): Promise<CatalogSummary> {
  const [categories, medicines] = await Promise.all([getCategories(opts), getMedicines(opts)]);

  const cats: CategorySummary[] = categories
    .map((c) => {
      const inCat = medicines.filter((m) => m.category?.slug === c.slug);
      const top = tally(inCat.map((m) => m.molecule))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 3)
        .map((t) => t.name);
      return { ...c, count: inCat.length, topMolecules: top };
    })
    .filter((c) => c.count > 0);

  const molecules = tally(medicines.map((m) => m.molecule));
  return {
    total: medicines.length,
    categoryCount: cats.length,
    moleculeCount: molecules.length,
    categories: cats,
    molecules: [...molecules].sort((a, b) => a.name.localeCompare(b.name)),
    popularMolecules: [...molecules]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 5),
  };
}

/**
 * Other products with the same molecule, then more from the same category —
 * led by the category's other molecules (one product each), with further
 * same-molecule products only filling any slots left.
 */
export async function getRelated(m: MedicineWithCategory, limit = 4) {
  const all = await getMedicines();
  const sameMolecule = all
    .filter((x) => x.id !== m.id && m.molecule && x.molecule === m.molecule)
    .slice(0, limit)
    .map(toCatalogItem);
  const taken = new Set([m.id, ...sameMolecule.map((x) => x.id)]);
  const pool = all
    .filter((x) => !taken.has(x.id) && m.category && x.category?.slug === m.category.slug)
    .map(toCatalogItem);
  const own = moleculeKey(m.molecule);
  const sameCategory = varied([...pool.filter((x) => moleculeKey(x.molecule) !== own), ...pool], limit);
  return { sameMolecule, sameCategory };
}
