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
