import type { Metadata } from "next";
import { site, siteUrl } from "@/lib/site";

/** Absolute URL on the site origin, for canonicals, JSON-LD, the sitemap and share tags. */
export const abs = (path: string): string => new URL(path, siteUrl).toString();

/** The site-wide share card (public/og-image.jpg, 1200×630): logo, name, tagline and export reach. */
export const ogImage = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  alt: `${site.fullName}: licensed pharmaceutical exporter with worldwide shipping to 50+ countries`,
};

/**
 * Open Graph defaults, share card included. Next.js replaces a page's whole `openGraph` object
 * instead of merging it with the layout's (a file-based opengraph-image would be dropped with it),
 * so every page that sets `openGraph` spreads this in first; a product with a real pack shot
 * replaces `images` with its own.
 */
export const ogBase = { siteName: site.fullName, type: "website" as const, locale: "en_US", images: [ogImage] };

/**
 * Metadata for a plain page: title, description, canonical and the Open Graph URL. og:title and
 * og:description are filled by Next from the page's resolved title and description; the share
 * image is the site card from ogBase.
 */
export function pageMeta(path: string, title: string, description: string): Metadata {
  return { title, description, alternates: { canonical: path }, openGraph: { ...ogBase, url: path } };
}

/** Phone number as E.164 ("+91 91850 81244" -> "+919185081244") for structured data. */
export const e164 = (phone: string): string => phone.replace(/[^\d+]/g, "");

/** Clip a meta description to the ~155 characters search engines show, at a word boundary. */
export function clip(text: string, max = 155): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 80)).replace(/[,;:–—-]\s*$/, "")}…`;
}
