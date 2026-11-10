import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { Review, ReviewStatus } from "@/types/db";

/**
 * Customer reviews: rows in public.reviews (supabase/schema.sql), photos in the
 * PRIVATE storage bucket `reviews` (photos/<id>.<ext>).
 *
 * - The public site reads with the anon key, which RLS limits to approved rows
 *   and a column grant to the published columns (never email or flagged).
 * - The moderation screen reads as the signed-in admin (RLS admin policy).
 * - Writes (new reviews, approve/hide/delete) go through the service role on
 *   the server, after validation or requireAdmin().
 * - Photos are reachable only through app/images/reviews/[file]/route.ts, and
 *   only while their review is approved.
 */

export const REVIEWS_BUCKET = "reviews";
export const REVIEWS_TAG = "reviews";

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const satisfies readonly ReviewStatus[];
export type { ReviewStatus };

/** What the public pages get: no email, no flag, the photo as a same-origin URL. */
export type PublicReview = {
  id: string;
  name: string;
  company: string | null;
  country: string | null;
  rating: number;
  comment: string;
  photoUrl: string | null;
  /** "November 2026", formatted on the server so every visitor sees the same text. */
  date: string;
};

/** Most reviews any one list loads; far more than the site will hold for a long time. */
const LIST_LIMIT = 200;

/** The columns granted to the public (supabase/schema.sql). Selecting any other column is refused. */
const PUBLIC_COLUMNS = "id, name, company, country, rating, comment, photo_path, created_at";

const PHOTO_PATH = /^photos\/([0-9a-f-]{36})\.(jpg|png|webp)$/;

let bucketReady = false;

/** Creates the private photo bucket on first use, so a fresh project needs no manual setup. */
export async function ensureReviewsBucket(): Promise<void> {
  if (bucketReady) return;
  const storage = createAdminClient().storage;
  const { data } = await storage.getBucket(REVIEWS_BUCKET);
  if (!data) {
    const { error } = await storage.createBucket(REVIEWS_BUCKET, { public: false });
    if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
  }
  bucketReady = true;
}

const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

type PublicRow = Pick<
  Review,
  "id" | "name" | "company" | "country" | "rating" | "comment" | "photo_path" | "created_at"
>;

function toPublic(r: PublicRow): PublicReview {
  const photo = r.photo_path?.match(PHOTO_PATH);
  return {
    id: r.id,
    name: r.name,
    company: r.company,
    country: r.country,
    rating: r.rating,
    comment: r.comment,
    photoUrl: photo ? `/images/reviews/${photo[1]}.${photo[2]}` : null,
    date: monthYear.format(new Date(r.created_at)),
  };
}

const cachedApproved = unstable_cache(
  async (): Promise<PublicReview[]> => {
    // RLS returns approved rows only; status itself is not a public column, so it is not filtered here.
    const { data, error } = await createPublicClient()
      .from("reviews")
      .select(PUBLIC_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);
    if (error) throw new Error(error.message);
    return ((data ?? []) as PublicRow[]).map(toPublic);
  },
  ["reviews:approved:v2"],
  { tags: [REVIEWS_TAG], revalidate: 300 },
);

/** Last good read in this server instance, so an outage keeps the reviews already shown. */
let lastApproved: PublicReview[] | null = null;

/** Approved reviews, newest first, for the public pages. Never throws: an outage shows the last good copy or none. */
export async function getApprovedReviews(): Promise<PublicReview[]> {
  try {
    lastApproved = await cachedApproved();
    return lastApproved;
  } catch (err) {
    console.error("[reviews] could not load approved reviews:", err);
    return lastApproved ?? [];
  }
}

/** The photo of an APPROVED review, or null (unknown id, not approved, no photo, read failure). */
export async function getApprovedPhoto(id: string, ext: string): Promise<{ body: Blob; contentType: string } | null> {
  const review = (await getApprovedReviews()).find((r) => r.id === id);
  if (!review || review.photoUrl !== `/images/reviews/${id}.${ext}`) return null;
  const { data, error } = await createAdminClient().storage.from(REVIEWS_BUCKET).download(`photos/${id}.${ext}`);
  if (error || !data) return null;
  return { body: data, contentType: ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg" };
}

/* ------------------------------------------------------------ moderation */

/**
 * Every review with this status, newest first, read as the signed-in admin.
 * Throws when the read fails, so an outage is never shown as "no reviews".
 */
export async function listReviews(status: ReviewStatus): Promise<Review[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) throw new Error(`Couldn't load reviews: ${error.message}`);
  return (data ?? []) as Review[];
}

/** How many reviews have this status (the admin nav badge and dashboard). */
export async function countReviews(status: ReviewStatus): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("status", status);
  if (error) throw new Error(`Couldn't count reviews: ${error.message}`);
  return count ?? 0;
}

/** Approve, hide or restore. False when the write failed or matched no row. */
export async function updateReviewStatus(id: string, status: ReviewStatus): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("reviews")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    console.error("[reviews] status update failed", { id, status }, error?.message ?? "no row updated");
    return false;
  }
  return true;
}

/** Deletes a review for good, and its photo. */
export async function deleteReview(id: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("reviews").delete().eq("id", id).select("photo_path");
  if (error || !data?.length) {
    console.error("[reviews] delete failed", { id }, error?.message ?? "no row deleted");
    return false;
  }
  const photo = (data[0] as Pick<Review, "photo_path">).photo_path;
  // The row is gone either way; a photo left behind is never served (no approved row points at it).
  if (photo) await admin.storage.from(REVIEWS_BUCKET).remove([photo]);
  return true;
}

/** Short-lived links to review photos for the moderation screen (the bucket is private). */
export async function signedPhotoUrls(reviews: Pick<Review, "photo_path">[]): Promise<Record<string, string>> {
  const paths = reviews.flatMap((r) => (r.photo_path && PHOTO_PATH.test(r.photo_path) ? [r.photo_path] : []));
  if (!paths.length) return {};
  const { data } = await createAdminClient().storage.from(REVIEWS_BUCKET).createSignedUrls(paths, 600);
  const out: Record<string, string> = {};
  for (const d of data ?? []) {
    const id = d.path?.match(PHOTO_PATH)?.[1];
    if (id && d.signedUrl) out[id] = d.signedUrl;
  }
  return out;
}
