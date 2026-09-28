/**
 * Central site configuration & branding. Update these placeholders with the
 * client's real details (TODO markers). Imported by the header, footer, home,
 * contact page, SEO metadata, and email notifications.
 */
export const site = {
  name: "Meridian",
  fullName: "Meridian Pharma International",
  tagline: "Global access to better health",
  description:
    "Meridian Pharma International is a global pharmaceutical exporter. Browse our medicine range and send an enquiry — our team responds with pricing, availability, and full documentation.",

  // TODO: replace with the client's real contact details.
  email: "exports@meridianpharma.example",
  phone: "+00 00000 00000",
  whatsapp: "+000000000000", // digits only used for wa.me links
  address: "TODO: Street, City, Country",

  // Headline numbers (shown as animated counters). TODO: confirm real figures.
  stats: {
    countries: 50,
    products: 1200,
    years: 20,
  },

  certifications: ["WHO-GMP", "ISO 9001:2015", "GDP Compliant"],

  nav: [
    { href: "/", label: "Home" },
    { href: "/medicines", label: "Medicines" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],
  legal: [
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
    { href: "/disclaimer", label: "Disclaimer" },
  ],
} as const;

/** wa.me link if a WhatsApp number is configured, else null. */
export function whatsappLink(text?: string): string | null {
  const digits = site.whatsapp.replace(/\D/g, "");
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
