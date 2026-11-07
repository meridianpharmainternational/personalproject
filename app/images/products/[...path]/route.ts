import { NextResponse } from "next/server";

/**
 * Same-origin product images: /images/products/<path> serves the file at that path in the
 * public `medicine-images` bucket. Supabase storage answers with `x-robots-tag: none` and a
 * private Cache-Control, so a photo linked straight from the bucket is neither indexed with
 * its product nor cached in front of the function; served from here it is both. The file
 * extension stays in the URL so middleware.ts skips these requests like any other image.
 */

/** One bucket path segment: the seed's "medi/<slug>.jpg" and the admin's "<uuid>.<ext>" shapes, nothing else. */
const SEGMENT = /^[A-Za-z0-9._-]+$/;
const EXTENSION = /\.(?:jpe?g|png|webp)$/i;
const MAX_LENGTH = 200;
/** A day in the browser, a week on the CDN, served stale for a month while it refreshes. */
const CACHE_CONTROL = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";
/** Storage headers passed through when present; the rest of its response (x-robots-tag, cookies) is dropped. */
const PASSED = ["Content-Length", "ETag", "Last-Modified"];

/** The bucket path the URL segments name, or null for anything but a plain image path. */
function bucketPath(segments: string[]): string | null {
  const path = segments.join("/");
  if (!segments.length || path.length > MAX_LENGTH || path.includes("..")) return null;
  if (!segments.every((s) => SEGMENT.test(s)) || !EXTENSION.test(path)) return null;
  return path;
}

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = bucketPath((await params).path);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return new NextResponse(null, { status: 404 });

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/storage/v1/object/public/medicine-images/${path}`);
  } catch {
    // Storage unreachable: an uncacheable 503, so the photo is retried rather than remembered as missing.
    return new NextResponse(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!upstream.ok || !upstream.body) {
    await upstream.body?.cancel();
    return new NextResponse(null, { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
    "Cache-Control": CACHE_CONTROL,
  });
  for (const name of PASSED) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: 200, headers });
}
