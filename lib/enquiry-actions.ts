"use client";

import { enquiryList, type AddInput, type EnquiryItem } from "@/lib/enquiry-list";
import { toast, announce } from "@/lib/ui-store";

/** Minimal product shape any add-to-enquiry entry point can supply. */
export type ProductLike = {
  id: string;
  name: string;
  molecule: string | null;
  form: string | null;
  strengths: string[];
  image: string | null;
};

/**
 * Build an enquiry-list input. With exactly one known strength we pre-select
 * it; otherwise the line starts as "Any / to be advised" (null) so the buyer is
 * never forced to decide before adding.
 */
export function toAddInput(p: ProductLike, strength?: string | null, qty?: number): AddInput {
  return {
    medicineId: p.id,
    name: p.name,
    molecule: p.molecule,
    form: p.form,
    strengths: p.strengths,
    image: p.image,
    strength: strength !== undefined ? strength : p.strengths.length === 1 ? p.strengths[0] : null,
    qty,
  };
}

/**
 * Toast / screen-reader name for one line that tells same-named products
 * apart ("IVERHEAL, Tablets, 12 mg" vs "IVERHEAL, Cream"), in the same style
 * as productLabel in components/enquiry/add-to-enquiry.tsx.
 */
const lineLabel = (l: Pick<EnquiryItem, "name" | "form" | "strength">) =>
  [l.name, l.form, l.strength].filter(Boolean).join(", ");

/** Store index of the first line matching `test`, or undefined (restore then appends). */
const indexOf = (test: (i: EnquiryItem) => boolean) => {
  const at = enquiryList.getSnapshot().items.findIndex(test);
  return at === -1 ? undefined : at;
};

/** Remove one line and offer Undo, which puts it back where it was. */
export function removeLineWithUndo(line: EnquiryItem) {
  const at = indexOf((i) => i.key === line.key);
  enquiryList.remove(line.key);
  const label = lineLabel(line);
  toast.show(`${label} removed`, [
    {
      label: "Undo",
      run: () => {
        enquiryList.restore([line], at);
        announce(`${label} restored to your enquiry list.`);
      },
    },
  ]);
  announce(`${label} removed from your enquiry list.`);
}

/**
 * Remove every line for a product (card toggle) and offer Undo, which puts the
 * lines back at the product's first position. `opts.announceMsg` replaces the
 * default screen-reader announcement (e.g. to say how to add it back).
 */
export function removeMedicineWithUndo(medicineId: string, name: string, opts?: { announceMsg?: string }) {
  const lines = enquiryList.getSnapshot().items.filter((i) => i.medicineId === medicineId);
  const at = indexOf((i) => i.medicineId === medicineId);
  enquiryList.removeMedicine(medicineId);
  toast.show(`${name} removed`, [
    {
      label: "Undo",
      run: () => {
        enquiryList.restore(lines, at);
        announce(`${name} restored to your enquiry list.`);
      },
    },
  ]);
  announce(opts?.announceMsg ?? `${name} removed from your enquiry list.`);
}

/** 32-bit FNV-1a hash of a string (UTF-16 code units): short, stable, not cryptographic. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Runs of anything that is not a letter or digit in any script. */
const NON_ALNUM = /[^\p{L}\p{N}]+/gu;

/**
 * Stable id for a custom (not-in-catalogue) request line: a readable,
 * Unicode-aware slug plus a hash of the whole normalised name. Different
 * requests never share an id, so none is dropped as a duplicate. That covers
 * non-Latin names ("Тадалафил 20 мг" / "Силденафил 20 мг", "他达拉非") and long
 * lines that begin the same way. The same text typed again (differing only in
 * case, spacing or Unicode form) still maps to the same line. The name is cut
 * to 200 characters first, as the enquiry list stores it (MAX_NAME).
 */
export const customId = (name: string) => {
  const text = name.trim().slice(0, 200).normalize("NFKC").toLowerCase().replace(/\s+/g, " ");
  const slug =
    Array.from(text.replace(NON_ALNUM, "-")).slice(0, 60).join("").replace(/^-+|-+$/g, "") || "item";
  return `custom:${slug}-${fnv1a(text).toString(36)}`;
};
