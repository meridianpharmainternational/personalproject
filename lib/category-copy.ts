/**
 * Search copy for the catalogue's landing pages, keyed by category slug. Pure data (no server
 * imports), so the client-rendered catalogue head can show the intro while the server page uses
 * the same words for <title> and the meta description. Rules: the words importers search with
 * (exporter, supplier, bulk, licensed importers and distributors) and the molecules and brands
 * actually in the catalogue; no product counts, no prices, no address, and no "bulk"/"wholesale"
 * on controlled ranges. Brand names must exist in the catalogue.
 *
 * Unknown slugs (a category added in the admin panel) fall back to the category's own name and
 * blurb; nothing here is required.
 */
export type CategoryCopy = {
  /** Keyword title before the site-name template; keep under ~60 characters. */
  title: string;
  /** One or two lines under the h1 on the category page. */
  intro: string;
  /** Meta description, 155 characters or fewer. */
  description: string;
};

export const CATEGORY_COPY: Record<string, CategoryCopy> = {
  "ed-medicines": {
    title: "ED Medicines Exporter & Bulk Supplier",
    intro:
      "Sildenafil, tadalafil, vardenafil and avanafil tablets and oral jellies — Cenforce, Vidalista, Kamagra and other Indian generic brands — supplied in bulk to licensed importers and distributors.",
    description:
      "Sildenafil and tadalafil tablets (Cenforce, Vidalista, Kamagra) exported in bulk to licensed importers and distributors. COA and documents on request.",
  },
  "mtp-kits": {
    title: "MTP Kits (Mifepristone + Misoprostol) Exporter",
    intro:
      "Mifepristone 200 mg + misoprostol 200 mcg combi-kits for medical termination of pregnancy, supplied only to licensed importers with destination-market authorisation; export is subject to regulatory approval.",
    description:
      "Mifepristone + misoprostol combi-kits (MTP kits) for licensed importers with destination-market authorisation. Export subject to regulatory approval.",
  },
  "anti-parasitic": {
    title: "Ivermectin & Albendazole Exporter – Anti-Parasitic",
    intro:
      "Ivermectin, albendazole, mebendazole and other anthelmintic and antiparasitic medicines in tablets and creams, supplied in bulk to licensed importers and distributors.",
    description:
      "Ivermectin, albendazole and mebendazole tablets and creams exported in bulk to licensed importers and distributors. COA and documents on request.",
  },
  painkillers: {
    title: "Pain Relief Medicines Exporter",
    intro:
      "Analgesics, muscle relaxants and nerve-pain therapies for licensed importers and distributors; controlled products are supplied only against the destination import permit.",
    description:
      "Analgesics, muscle relaxants and nerve-pain therapies for licensed importers and distributors; controlled products only against an import permit.",
  },
  "sleeping-pills": {
    title: "Zopiclone & Eszopiclone Tablets Exporter – Sleeping Aids",
    intro:
      "Zopiclone, eszopiclone, melatonin and other sleep-support medicines supplied in bulk to licensed importers and distributors; controlled products need an import permit.",
    description:
      "Zopiclone, eszopiclone and melatonin tablets exported in bulk to licensed importers and distributors; controlled products need an import permit.",
  },
  "sleep-alert": {
    title: "Modafinil & Armodafinil Tablets Exporter – Wakefulness",
    intro:
      "Modafinil and armodafinil tablets — Modvigil, Artvigil and other brands — supplied in bulk to licensed importers and distributors.",
    description:
      "Modafinil and armodafinil tablets (Modvigil, Artvigil) exported in bulk to licensed importers and distributors. COA and export documents on request.",
  },
  "hair-loss": {
    title: "Finasteride, Dutasteride & Minoxidil Exporter – Hair Care",
    intro:
      "Finasteride and dutasteride tablets, minoxidil solutions and other hair-regrowth products, supplied in bulk to licensed importers and distributors.",
    description:
      "Finasteride, dutasteride and minoxidil hair-regrowth products exported in bulk to licensed importers and distributors. Documents on request.",
  },
  injectables: {
    title: "Pharmaceutical Injectables Exporter",
    intro:
      "Injectable hormone and anabolic preparations in vials and ampoules for licensed importers and distributors; controlled in most markets and supplied only against the destination import permit.",
    description:
      "Injectable hormone preparations in vials and ampoules for licensed importers and distributors; controlled in most markets, import permit required.",
  },
  "oral-therapies": {
    title: "Oral Hormone Therapies Exporter",
    intro:
      "Oral anabolic and hormone therapies in tablets and capsules for licensed importers and distributors; controlled in most markets and supplied only against the destination import permit.",
    description:
      "Oral hormone therapies in tablets and capsules for licensed importers and distributors; controlled in most markets, supplied only against an import permit.",
  },
  cosmetics: {
    title: "Dermal Fillers & Botulinum Toxins Wholesale",
    intro:
      "Korean dermal fillers, botulinum toxins, skin boosters, lipolysis injections and collagen stimulators (poly-L-lactic acid, calcium hydroxylapatite) for licensed clinics and distributors.",
    description:
      "Korean dermal fillers, botulinum toxins, skin boosters and lipolysis injections supplied wholesale to licensed clinics and distributors.",
  },
};
// The two hormone ranges were seeded under these slugs before they were renamed; keep both spellings.
CATEGORY_COPY["steroid-injections"] = CATEGORY_COPY.injectables;
CATEGORY_COPY["steroid-tablets"] = CATEGORY_COPY["oral-therapies"];

export const categoryCopy = (slug: string | null | undefined): CategoryCopy | undefined =>
  slug ? CATEGORY_COPY[slug] : undefined;

/* ------------------------------------------------------------ molecules */

/** "Sildenafil Citrate Tablets Exporter & Supplier" — the <title> of a molecule landing page. */
export const moleculeTitle = (name: string, form?: string | null): string =>
  `${name}${form ? ` ${form}` : ""} Exporter & Supplier`;

/**
 * The line under a molecule page's h1 and the seed of its meta description. "Supplied", never
 * "bulk" or "wholesale": some molecules are controlled, and the wording stays the same for all.
 */
export function moleculeIntro(name: string, forms: readonly string[], brands: readonly string[]): string {
  const form = forms.length ? ` ${forms.slice(0, 2).join(" and ").toLowerCase()}` : "";
  const list = brands.slice(0, 4).join(", ");
  const names = list ? ` — ${list}${brands.length > 4 ? " and other brands" : ""} —` : "";
  return `${name}${form}${names} supplied to licensed importers and distributors.`;
}

export function moleculeDescription(name: string, forms: readonly string[], brands: readonly string[]): string {
  return `${moleculeIntro(name, forms, brands)} Strengths, packs and documents are confirmed with your quotation.`;
}
