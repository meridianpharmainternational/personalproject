import type { MetadataRoute } from "next";
import { getCatalogItems, getCatalogSummary } from "@/lib/catalog";
import { site, siteUrl } from "@/lib/site";

// Crawlers read the sitemap far less often than visitors load pages, so hourly is enough.
export const revalidate = 3600;

const STATIC_PATHS = ["/", "/medicines", "/about", "/contact", ...site.legal.map((l) => l.href)];

/**
 * Every public page as an absolute URL on siteUrl: the static pages, one
 * landing URL per category and per molecule (the same links the home page and
 * the A–Z use), then each product page. If the catalogue can't be read, the
 * static pages are still listed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths: string[] = [...STATIC_PATHS];
  try {
    const [summary, items] = await Promise.all([
      getCatalogSummary({ strict: true }),
      getCatalogItems({ strict: true }),
    ]);
    paths.push(
      ...summary.categories.map((c) => `/medicines?category=${encodeURIComponent(c.slug)}`),
      ...summary.molecules.map((m) => `/medicines?molecule=${encodeURIComponent(m.name)}`),
      ...items.map((it) => `/medicines/${encodeURIComponent(it.id)}`),
    );
  } catch (err) {
    console.error("[sitemap] catalogue unavailable, listing static pages only:", err);
  }
  return [...new Set(paths)].map((path) => ({ url: new URL(path, siteUrl).toString() }));
}
