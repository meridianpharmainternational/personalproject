import { connection, NextResponse } from "next/server";
import { getCatalogItems } from "@/lib/catalog";

/**
 * Lean search index of every active product (~30KB), loaded by the header
 * search and the enquiry drawer on first focus. Filtering happens in the
 * browser, so typing is instant.
 *
 * Regenerated at most every 5 minutes (at once after an admin edit, via the
 * catalog tag), and shared caches may keep it for the same 5 minutes, so
 * edits and deletions reach search within `revalidate`.
 *
 * The read is strict, and an empty index counts as a failure (the client
 * treats [] as "unavailable" too), so an empty index is never cached:
 * - during a background ISR regeneration the failure throws, and Next keeps
 *   serving the last good index and retries shortly;
 * - at build time the route is marked dynamic instead of failing the build;
 * - on a real request with nothing to fall back on (a cold start), the
 *   response is a 503 JSON error that nothing may store.
 */
export const revalidate = 300;

const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=86400";

async function loadIndex() {
  try {
    const items = await getCatalogItems({ strict: true });
    return items.map(({ id, name, molecule, form, strengths, category, availability, image, ester }) => ({
      id,
      name,
      molecule,
      form,
      strengths,
      category,
      availability,
      image,
      ester,
    }));
  } catch {
    return []; // getMedicines has already logged the cause
  }
}

export async function GET() {
  const index = await loadIndex();
  if (!index.length) {
    // Opts this response out of static generation: while prerendering (build or
    // ISR regeneration) it throws, so Next never stores this error in place of
    // the last good index. Only a real request gets past it.
    await connection();
    return NextResponse.json(
      { error: "The product index is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(index, { headers: { "Cache-Control": CACHE_CONTROL } });
}
