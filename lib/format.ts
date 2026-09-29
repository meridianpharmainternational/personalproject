/**
 * Pure formatting helpers — safe to import from client components (no server
 * or Supabase imports here).
 */

/** Split the comma-separated strengths string into a clean array. */
export function parseStrengths(strengths: string | null | undefined): string[] {
  if (!strengths) return [];
  return strengths
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Display only (the stored value is untouched): a short value such as
 * "100 mg", "On request" or "10 x 10 blister" gets no-break spaces so it never
 * splits across lines; longer text only keeps each number with its unit.
 */
export function keepTogether(s: string): string {
  return s.length <= 16 ? s.replace(/ /g, " ") : s.replace(/(\d) (?=\S)/g, "$1 ");
}

/**
 * The molecule as buyers name it. Injectables are stored under their base molecule and the
 * ester is recorded separately (CatalogItem.ester), so "Testosterone" + "enanthate" reads
 * "Testosterone Enanthate". Without an ester, or when the molecule already names it, the
 * molecule is returned as it is.
 */
export function moleculeLabel(molecule: string | null | undefined, ester?: string | null): string | null {
  if (!molecule) return null;
  if (!ester || molecule.toLowerCase().includes(ester)) return molecule;
  return `${molecule} ${ester[0].toUpperCase()}${ester.slice(1)}`;
}

/** One product line in a multi-product enquiry. */
export type EnquiryLine = {
  name: string;
  molecule?: string | null;
  form?: string | null;
  strength?: string | null;
  qty: number;
};

/**
 * Human-readable numbered list, used for the stored enquiry, the email
 * notification and the WhatsApp hand-off, e.g.
 *   1. Cenforce 100 mg (Sildenafil Citrate, Tablets) — 10 packs
 */
export function formatEnquiryItems(items: EnquiryLine[]): string {
  return items
    .map((it, i) => {
      const title = [it.name, it.strength].filter(Boolean).join(" ");
      const meta = [it.molecule, it.form].filter(Boolean).join(", ");
      const packs = `${it.qty} pack${it.qty === 1 ? "" : "s"}`;
      return `${i + 1}. ${title}${meta ? ` (${meta})` : ""} — ${packs}`;
    })
    .join("\n");
}
