import { abs, e164 } from "@/lib/seo";
import { contact, site } from "@/lib/site";

export type JsonLdNode = Record<string, unknown>;

export const ORG_ID = abs("/#organization");
export const SITE_ID = abs("/#website");

/** The buyers every page is for; used as `audience` on Product and WebSite nodes (not Organization). */
export const BUSINESS_AUDIENCE = {
  "@type": "BusinessAudience",
  audienceType: "Licensed pharmaceutical importers and distributors",
} as const;

/**
 * One JSON-LD script holding the given nodes as a @graph. "<" is escaped so the JSON can never
 * close the script tag (the same escape the product page has always used).
 */
export function JsonLd({ nodes }: { nodes: JsonLdNode[] }) {
  const graph = { "@context": "https://schema.org", "@graph": nodes };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }}
    />
  );
}

/**
 * The company. Plain Organization on purpose: Pharmacy / MedicalBusiness / LocalBusiness types
 * expect a postal address (the owner publishes none) and label the site as a consumer shop.
 * No address, no prices, no product counts. Certifications are not encoded until the owner
 * supplies certificate numbers and issuers. Facebook's share short-link is not a profile URL,
 * so it is left out of sameAs until the Page's own URL is known.
 */
export function organizationNode(knowsAbout: string[] = []): JsonLdNode {
  const phone = contact.phone ? e164(contact.phone) : null;
  const phone2 = contact.phone2 ? e164(contact.phone2) : null;
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: site.fullName,
    alternateName: ["Meridian Pharma", site.name],
    url: abs("/"),
    logo: { "@type": "ImageObject", url: abs("/logo-512.png"), width: 512, height: 512 },
    image: abs("/logo-512.png"),
    description: site.description,
    slogan: site.tagline,
    ...(contact.email ? { email: contact.email } : {}),
    ...(phone ? { telephone: phone } : {}),
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        ...(phone ? { telephone: phone } : {}),
        ...(contact.email ? { email: contact.email } : {}),
        availableLanguage: ["en"],
      },
      ...(phone2
        ? [{ "@type": "ContactPoint", contactType: "sales", telephone: phone2, availableLanguage: ["en"] }]
        : []),
    ],
    // The Maps listing is for search engines only (never shown on the page); the IndiaMART site is the
    // company's own second website.
    hasMap: site.googleBusiness.map,
    sameAs: [
      ...site.social.filter((s) => !/facebook\.com\/share\//.test(s.href)).map((s) => s.href),
      site.store.href,
      `https://www.google.com/search?kgmid=${site.googleBusiness.kgmid}`,
    ],
    areaServed: "Worldwide",
    ...(knowsAbout.length ? { knowsAbout } : {}),
  };
}

export function webSiteNode(): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    url: abs("/"),
    name: site.fullName,
    alternateName: ["Meridian Pharma", site.name],
    inLanguage: "en",
    publisher: { "@id": ORG_ID },
    audience: BUSINESS_AUDIENCE,
  };
}

/** Products › Category › Product. The last item carries no URL (Google's breadcrumb guidance). */
export function breadcrumbNode(items: { name: string; path?: string }[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.path ? { item: abs(it.path) } : {}),
    })),
  };
}
