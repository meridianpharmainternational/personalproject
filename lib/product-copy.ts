import { clip } from "@/lib/seo";
import { moleculeLabel } from "@/lib/format";
import { site } from "@/lib/site";
import type { CatalogItem } from "@/lib/catalog";
import type { MedicineWithCategory } from "@/types/db";

/**
 * Copy for a product page written from the product's own fields: the <title>, the meta
 * description and the supply paragraph under the specification. Pure (type-only catalogue
 * import), so a script can run it over every product. Rules as in lib/category-copy.ts: the
 * words importers search with, "licensed importers and distributors" (never consumer-shop
 * wording), and no prices, counts or addresses; nothing is said that the catalogue row does
 * not say.
 */

const MAX_DESCRIPTION = 155;

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/** Does `text` already say `part` (case-insensitively)? Never for a missing part. */
const says = (text: string | null, part: string | null) => !!part && norm(text).includes(norm(part));

/**
 * "Cenforce – Sildenafil Citrate Tablets Exporter": the (disambiguated) product name, what the
 * molecule and the form add to it, and the word importers search with. The form is left out
 * when the name or the molecule already says it ("IVERHEAL Tablets – Ivermectin Exporter",
 * "Botulax – Botulinum toxin type A Exporter").
 */
export function seoTitle(name: string, label: string | null, form: string | null): string {
  const descriptor = [says(name, label) ? null : label, says(name, form) || says(label, form) ? null : form]
    .filter(Boolean)
    .join(" ");
  return `${name}${descriptor ? ` – ${descriptor}` : ""} Exporter`;
}

/**
 * The meta description, 155 characters at most: what the product is (the form only when the
 * molecule does not already say it) and who it is supplied to, with its strengths as far as
 * the limit allows (dropped from the last) and the documents line when that still fits.
 * clip() only guards a very long name.
 */
export function productDescription(m: MedicineWithCategory, item: CatalogItem): string {
  const label = moleculeLabel(m.molecule, item.ester);
  const what = [label, says(label, m.form) ? null : m.form].filter(Boolean).join(" ");
  const lead = what ? `${m.name}: ${what}` : m.name;
  const text = (strengths: string[]) =>
    `${lead}${strengths.length ? ` in ${strengths.join(", ")}` : ""}, supplied to licensed importers and distributors.`;
  let strengths = item.strengths;
  while (strengths.length && text(strengths).length > MAX_DESCRIPTION) strengths = strengths.slice(0, -1);
  const base = text(strengths);
  const withDocuments = `${base} COA and export documents on request.`;
  return clip(withDocuments.length <= MAX_DESCRIPTION ? withDocuments : base);
}

/** "WHO-GMP, ISO 9001:2015 and GDP Compliant". */
const listed = (items: readonly string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}` : items.join("");

/** Stable small hash (djb2), so a category's sentence order never changes between renders or deploys. */
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * The supply paragraph under the specification (and the JSON-LD description when the owner
 * has written none): what the product is, who exports it to whom, which documents come with
 * it, and the enquiry step, 60–90 words from the row's own fields. Products of one range
 * would otherwise read almost alike, so the first three sentences come in one of three
 * orders chosen by the category slug; the product is named before it is called "it".
 */
export function supplyDetails(m: MedicineWithCategory, item: CatalogItem): string {
  const label = moleculeLabel(m.molecule, item.ester);
  const strengths = item.strengths.length
    ? `, in ${item.strengths.join(", ")}`
    : m.strengths?.trim()
      ? ", strengths on request"
      : "";
  // "Botulinum toxin type A supplied in the … range", not "… supplied as Botulinum toxin in the … range".
  const form = says(label, m.form) ? "" : ` as ${m.form ?? "a finished formulation"}`;
  const what =
    `${m.name} is ${label ? `${label} ` : ""}supplied${form}` +
    `${m.category ? ` in the ${m.category.name} range` : ""}${strengths}${m.pack ? `, packed as ${m.pack}` : ""}.`;
  const exported = (subject: string) =>
    `${site.fullName} exports ${subject} to licensed importers and distributors` +
    `${m.lead_time ? `; typical lead time ${m.lead_time}` : ""}` +
    `${item.availability === "made-to-order" ? ", made to order" : ""}.`;
  const documents =
    "Certificate of Analysis (COA) and Certificate of a Pharmaceutical Product (COPP) are available on request, " +
    `together with the manufacturer's ${listed(site.certifications)} documentation.`;
  const enquire = "Add it to your enquiry list for pricing, availability and documents.";

  const order = m.category ? hash(m.category.slug) % 3 : 0;
  const opening =
    order === 1
      ? [what, documents, exported("it")]
      : order === 2
        ? [exported(m.name), what, documents]
        : [what, exported("it"), documents];
  return [...opening, enquire].join(" ");
}
