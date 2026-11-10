/**
 * Central site configuration & branding. Replace the placeholders with the
 * client's real details (TODO markers). Placeholder values are detected below
 * and HIDDEN from the public site rather than shown as fake contact data.
 */
/**
 * The live site. NEXT_PUBLIC_SITE_URL overrides it (see resolveSiteUrl). www is the canonical
 * host; the apex redirects to it (next.config.ts and the Vercel domain settings).
 */
export const PRODUCTION_URL = "https://www.meridiannpharmainternational.com";

export const site = {
  name: "Meridian",
  fullName: "Meridian Pharma International",
  tagline: "Global access to better health",
  description:
    "Meridian Pharma International is a global pharmaceutical exporter. Build one enquiry list across our catalogue and our export team replies with pricing, availability and documentation.",

  // Contact details from the owner (2026-11-04); the same number is on WhatsApp.
  // No postal address, by the owner's decision.
  email: "meridianpharmainternational@gmail.com",
  phone: "+91 91850 81244",
  whatsapp: "+91 91850 81244", // digits only are used for wa.me links
  /** Products available to order (owner's figure, 2026-11-04). The catalogue lists a selection. */
  catalogueSize: "13,000+",
  /** Social channels: contact bar, footer, phone menu, Contact page and the hero. */
  social: [
    { name: "Telegram", handle: "@Meridianpharmainternational", href: "https://t.me/Meridianpharmainternational" },
    { name: "Instagram", handle: "@meridianpharma1", href: "https://www.instagram.com/meridianpharma1/" },
    { name: "Facebook", handle: "Our Facebook page", href: "https://www.facebook.com/share/1DWyanL6zr/" },
  ],

  /*
   * Export reach, shipping, payment and desk hours: the same terms as the Divine
   * Enterprises site (owner's request, 2026-11-03), plus Zelle.
   * TODO(content): confirm each with the owner; add the desk's time zone (the
   * Divine site doesn't state one).
   */
  exportReach: {
    /** Footer, hero, Contact and About. */
    short: "worldwide shipping to 50+ countries",
    long: "Worldwide shipping to 50+ countries across five continents.",
    note: "Shipping availability may vary based on product type, destination and regulatory restrictions.",
  },
  shipping: {
    /** Hero, Contact and About, word for word from the Divine site (owner's request, 2026-11-04). */
    us: "US-to-US overnight & 3-day delivery",
    processing: "within 24 hours of payment",
    standard: "9–10 days",
    express: "6–7 days, with real-time tracking",
  },
  payments: [
    "Bank transfer",
    "Wise (card / Visa)",
    "MoneyGram",
    "Bitcoin",
    "Ethereum (ETH)",
    "USDT",
    "Zelle",
    "Monzo",
    "Revolut / Remitly",
  ],
  deskHours: "Monday to Saturday, 9:00–18:00",

  /*
   * Company identity for the About page and structured data: legal name, year established,
   * country, importer-exporter code, drug licence and GST numbers. Every field is optional; an
   * empty field is hidden, so nothing invented ever ships.
   * TODO(content): fill in from the owner's registration documents.
   */
  company: {
    legalName: "",
    established: "",
    country: "",
    iec: "",
    drugLicence: "",
    drugLicenceAuthority: "",
    gstin: "",
  },

  certifications: ["WHO-GMP", "ISO 9001:2015", "GDP Compliant"],

  nav: [
    { href: "/medicines", label: "Products" },
    { href: "/about", label: "About" },
    { href: "/reviews", label: "Reviews" },
    { href: "/contact", label: "Contact" },
  ],
  legal: [
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
    { href: "/disclaimer", label: "Disclaimer" },
  ],
} as const;

const isPlaceholderEmail = (v: string) => !v.trim() || /\.example$/i.test(v.trim()) || /todo/i.test(v);
const isPlaceholderPhone = (v: string) => {
  const d = v.replace(/\D/g, "");
  return d.length < 6 || /^0+$/.test(d);
};

/** Real contact details only — each is null while it is still a placeholder. */
export const contact = {
  email: isPlaceholderEmail(site.email) ? null : site.email,
  /** The address split at the "@", so narrow columns can wrap it there (a <wbr>) instead of mid-word. */
  emailParts: isPlaceholderEmail(site.email) ? null : (site.email.split("@") as [string, string]),
  phone: isPlaceholderPhone(site.phone) ? null : site.phone,
  phoneHref: isPlaceholderPhone(site.phone) ? null : `tel:${site.phone.replace(/[^\d+]/g, "")}`,
} as const;

/**
 * Absolute origin for canonical, Open Graph, sitemap and robots URLs.
 * NEXT_PUBLIC_SITE_URL wins (set it to the live domain). On Vercel, the
 * production domain is used, even on preview builds, so canonicals always point
 * at production. Values without a scheme get https://. A malformed value is
 * skipped rather than failing the build. A production build with neither value
 * falls back to PRODUCTION_URL (never localhost), with a warning.
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
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[site] NEXT_PUBLIC_SITE_URL is not set; using " + PRODUCTION_URL + " for canonical, sitemap and share URLs",
    );
    return new URL(PRODUCTION_URL);
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
