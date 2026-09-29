import { site } from "@/lib/site";

/** One row of the "Quality & documentation" ledger. */
export type DocEntry = { name: string; scope: string; availability: string };

/** What each standard or document is. Definitions only: availability stays "On request". */
export const DOC_SCOPE: Record<string, string> = {
  "WHO-GMP": "Good Manufacturing Practice, to World Health Organization guidelines",
  "ISO 9001:2015": "Quality management system standard",
  "GDP Compliant": "Good Distribution Practice for storage and transport",
};

/**
 * The certifications from site config, then the batch documents buyers ask for.
 * Shared by the home and About ledgers so both read the same.
 */
export const DOCS: readonly DocEntry[] = [
  ...site.certifications.map((c) => ({
    name: c,
    scope: DOC_SCOPE[c] ?? "Certification",
    availability: "On request",
  })),
  { name: "COA", scope: "Certificate of Analysis: batch test results", availability: "On request" },
  { name: "COPP", scope: "Certificate of a Pharmaceutical Product (WHO scheme)", availability: "On request" },
];
