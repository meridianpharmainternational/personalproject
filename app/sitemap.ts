import type { MetadataRoute } from "next";
import { getCategories, getMedicines } from "@/lib/catalog";
import { abs } from "@/lib/seo";
import { site } from "@/lib/site";
import { medicineImageUrl } from "@/lib/storage";
import type { MedicineWithCategory } from "@/types/db";

// Crawlers read the sitemap far less often than visitors load pages, so hourly is enough.
export const revalidate = 3600;

const STATIC_PATHS = ["/", "/medicines", "/about", "/reviews", "/contact", ...site.legal.map((l) => l.href)];

type Entry = MetadataRoute.Sitemap[number];

/** When the product last changed (undefined when the row carries no usable timestamp). */
function modifiedAt(m: MedicineWithCategory): Date | undefined {
  const date = new Date(m.updated_at ?? m.created_at);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** The later of two dates, either of which may be missing. */
const later = (a?: Date, b?: Date) => (!a ? b : !b ? a : a.getTime() >= b.getTime() ? a : b);

/**
 * Every public page as an absolute URL on siteUrl, each once: the static pages, one landing
 * URL per category with products and per molecule with more than one product (the catalogue
 * sets a single-product molecule page noindex, since the product page is the result), then
 * each product page with its photo. The product pages link to their molecule page and the
 * catalogue's molecule index to all of them. Last-modified comes from the products (a
 * category or molecule page changed when its newest product did); the static pages carry
 * none, as nothing records when their copy changed. If the catalogue can't be read, the
 * static pages are still listed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = new Map<string, Entry>();
  const add = (path: string, entry: Omit<Entry, "url"> = {}) => {
    const url = abs(path);
    if (!entries.has(url)) entries.set(url, { url, ...entry });
  };
  for (const path of STATIC_PATHS) add(path);

  try {
    const [categories, medicines] = await Promise.all([
      getCategories({ strict: true }),
      getMedicines({ strict: true }),
    ]);
    // The newest product per category slug and per molecule, and how many products a molecule has.
    const byCategory = new Map<string, Date | undefined>();
    const byMolecule = new Map<string, { count: number; modified?: Date }>();
    for (const m of medicines) {
      const modified = modifiedAt(m);
      if (m.category) byCategory.set(m.category.slug, later(byCategory.get(m.category.slug), modified));
      if (m.molecule) {
        const seen = byMolecule.get(m.molecule);
        byMolecule.set(m.molecule, { count: (seen?.count ?? 0) + 1, modified: later(seen?.modified, modified) });
      }
    }
    for (const c of categories) {
      if (byCategory.has(c.slug)) {
        add(`/medicines?category=${encodeURIComponent(c.slug)}`, { lastModified: byCategory.get(c.slug) });
      }
    }
    for (const [name, { count, modified }] of [...byMolecule].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (count > 1) add(`/medicines?molecule=${encodeURIComponent(name)}`, { lastModified: modified });
    }
    for (const m of medicines) {
      const image = medicineImageUrl(m.image_path);
      add(`/medicines/${encodeURIComponent(m.id)}`, {
        lastModified: modifiedAt(m),
        ...(image ? { images: [abs(image)] } : {}),
      });
    }
  } catch (err) {
    console.error("[sitemap] catalogue unavailable, listing static pages only:", err);
  }
  return [...entries.values()];
}
