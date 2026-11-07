/**
 * Site-relative URL of an image in the public `medicine-images` bucket, served by
 * app/images/products/[...path]/route.ts from this origin so crawlers index the photo with
 * its product and the CDN caches it (the bucket itself answers with x-robots-tag: none and a
 * private cache). Works on both server and client; absolute URLs (sitemap, JSON-LD) are
 * built from it with abs() in lib/seo.
 */
export function medicineImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  return `/images/products/${imagePath}`;
}
