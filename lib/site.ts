/**
 * Central site configuration & branding. Replace the placeholders with the
 * client's real details (TODO markers). Placeholder values are detected below
 * and HIDDEN from the public site rather than shown as fake contact data.
 */
export const site = {
  name: "Meridian",
  fullName: "Meridian Pharma International",
  tagline: "Global access to better health",
  description:
    "Meridian Pharma International is a global pharmaceutical exporter. Build one enquiry list across our catalogue and our export team replies with pricing, availability and documentation.",

  // TODO: replace with the client's real contact details (placeholders are hidden).
  email: "exports@meridianpharma.example",
  phone: "+00 00000 00000",
  whatsapp: "+000000000000", // digits only used for wa.me links
  address: "TODO: Street, City, Country",

  // Market reach. TODO: set confirmed=true once the figure is verified.
  markets: { count: 50, confirmed: false },

  // Legacy figures kept for compatibility; product counts now come from the DB.
  stats: { countries: 50, products: 1200, years: 20 },

  certifications: ["WHO-GMP", "ISO 9001:2015", "GDP Compliant"],

  nav: [
    { href: "/medicines", label: "Products" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],
  legal: [
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
    { href: "/disclaimer", label: "Disclaimer" },
  ],
} as const;

const isPlaceholderEmail = (v: string) =>
  !v.trim() || /\.example$/i.test(v.trim()) || /todo/i.test(v);
const isPlaceholderPhone = (v: string) => {
  const d = v.replace(/\D/g, "");
  return d.length < 6 || /^0+$/.test(d);
};
const isPlaceholderText = (v: string) => !v.trim() || /^\s*todo\b/i.test(v);

/** Real contact details only — each is null while it is still a placeholder. */
export const contact = {
  email: isPlaceholderEmail(site.email) ? null : site.email,
  phone: isPlaceholderPhone(site.phone) ? null : site.phone,
  phoneHref: isPlaceholderPhone(site.phone) ? null : `tel:${site.phone.replace(/[^\d+]/g, "")}`,
  address: isPlaceholderText(site.address) ? null : site.address,
} as const;

/**
 * Absolute origin for canonical, Open Graph, sitemap and robots URLs.
 * NEXT_PUBLIC_SITE_URL wins (set it to the live domain). On Vercel, the
 * production domain is used, even on preview builds, so canonicals always point
 * at production. Values without a scheme get https://. A malformed value is
 * skipped rather than failing the build.
 */
function resolveSiteUrl(): URL {
  const candidates = [process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL];
  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    } catch {
      // Not a valid URL; fall through to the next source.
    }
  }
  return new URL("http://localhost:3000");
}

/**
 * The site's absolute origin (see resolveSiteUrl). Server-side use: in the
 * browser only NEXT_PUBLIC_SITE_URL is visible. Treat it as read-only and build
 * page URLs with `new URL(path, siteUrl)`.
 */
export const siteUrl: URL = resolveSiteUrl();

/** wa.me link if a real WhatsApp number is configured, else null. */
export function whatsappLink(text?: string): string | null {
  const digits = site.whatsapp.replace(/\D/g, "");
  if (!digits || digits.length < 6 || /^0+$/.test(digits)) return null;
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
