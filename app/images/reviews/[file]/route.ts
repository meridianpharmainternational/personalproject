import { NextResponse } from "next/server";
import { getApprovedPhoto } from "@/lib/reviews";

/**
 * Reviewer photos: /images/reviews/<review id>.<ext>. The reviews bucket is
 * private, so this is the only way a photo reaches the public site, and only
 * while its review is approved (an unknown, pending or rejected review is a
 * 404). The extension stays in the URL so middleware.ts skips these requests.
 */

const FILE = /^([0-9a-f-]{36})\.(jpg|png|webp)$/;
/** A day everywhere: a review the admin hides stops showing within a day even where it was cached. */
const CACHE_CONTROL = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400";

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const m = (await params).file.match(FILE);
  if (!m) return new NextResponse(null, { status: 404 });
  const photo = await getApprovedPhoto(m[1], m[2]);
  if (!photo) return new NextResponse(null, { status: 404 });
  return new Response(photo.body, {
    status: 200,
    headers: { "Content-Type": photo.contentType, "Cache-Control": CACHE_CONTROL },
  });
}
