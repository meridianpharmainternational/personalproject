import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Customer reviews, kept in the PRIVATE Supabase storage bucket `reviews` (one
 * small JSON file per review, plus an optional photo) and read only on the server
 * with the service-role client. Moderation state is the folder a review sits in:
 *
 *   pending/<stamp>_<id>.json    submitted, waiting for an admin
 *   approved/<stamp>_<id>.json   shown on the site
 *   rejected/<stamp>_<id>.json   kept for the record, never shown
 *   photos/<id>.<ext>            served only while the review is approved
 *
 * Storage rather than a table because the app never migrates the database (the
 * owner applies supabase/schema.sql by hand), and reviews are few and written
 * rarely. <stamp> is the submission time, so listing a folder by name, newest
 * first, is the display order. The bucket being private means nothing here is
 * reachable from the browser: public pages get approved reviews through
 * getApprovedReviews() and photos through app/images/reviews/[file]/route.ts.
 */

export const REVIEWS_BUCKET = "reviews";
export const REVIEWS_TAG = "reviews";

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** A review as stored. `email` is never shown publicly. */
export type StoredReview = {
  id: string;
  name: string;
  company: string | null;
  country: string | null;
  email: string | null;
  rating: number;
  comment: string;
  /** Path of the photo in the bucket ("photos/<id>.jpg"), or null. */
  photo: string | null;
  createdAt: string;
  /** The hidden form field was filled: probably a bot. Shown to the admin, never published. */
  flagged: boolean;
};

export type AdminReview = StoredReview & { status: ReviewStatus; file: string };

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

/** Most reviews a folder listing returns; more than the site will show for a long time. */
const LIST_LIMIT = 200;

const ID = /^[0-9a-f-]{36}$/;
const PHOTO_PATH = /^photos\/([0-9a-f-]{36})\.(jpg|png|webp)$/;

/** "20261110T091530Z": sortable as text, safe in a storage key. */
export const stampOf = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

export const reviewFile = (r: Pick<StoredReview, "id" | "createdAt">) => `${stampOf(r.createdAt)}_${r.id}.json`;

let bucketReady = false;

/** Creates the private bucket on first use, so a fresh project needs no manual setup. */
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

function parse(raw: string): StoredReview | null {
  try {
    const r = JSON.parse(raw) as Partial<StoredReview>;
    if (!r.id || !ID.test(r.id) || !r.name || !r.comment || !r.createdAt) return null;
    const rating = Math.round(Number(r.rating));
    if (!(rating >= 1 && rating <= 5)) return null;
    return {
      id: r.id,
      name: r.name,
      company: r.company || null,
      country: r.country || null,
      email: r.email || null,
      rating,
      comment: r.comment,
      photo: r.photo && PHOTO_PATH.test(r.photo) ? r.photo : null,
      createdAt: r.createdAt,
      flagged: Boolean(r.flagged),
    };
  } catch {
    return null;
  }
}

/** Every review in one folder, newest first. Throws when storage cannot be read. */
export async function listReviews(status: ReviewStatus): Promise<AdminReview[]> {
  const storage = createAdminClient().storage.from(REVIEWS_BUCKET);
  const { data, error } = await storage.list(status, {
    limit: LIST_LIMIT,
    sortBy: { column: "name", order: "desc" },
  });
  if (error) {
    // A project whose bucket does not exist yet simply has no reviews.
    if (/not found/i.test(error.message)) return [];
    throw new Error(error.message);
  }
  const files = (data ?? []).filter((f) => f.name.endsWith(".json"));
  const reviews = await Promise.all(
    files.map(async (f) => {
      const { data: blob, error: e } = await storage.download(`${status}/${f.name}`);
      if (e || !blob) return null;
      const r = parse(await blob.text());
      return r ? { ...r, status, file: f.name } : null;
    }),
  );
  return reviews.filter((r): r is AdminReview => r !== null);
}

const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

function toPublic(r: StoredReview): PublicReview {
  const photo = r.photo?.match(PHOTO_PATH);
  return {
    id: r.id,
    name: r.name,
    company: r.company,
    country: r.country,
    rating: r.rating,
    comment: r.comment,
    photoUrl: photo ? `/images/reviews/${photo[1]}.${photo[2]}` : null,
    date: monthYear.format(new Date(r.createdAt)),
  };
}

const cachedApproved = unstable_cache(
  async (): Promise<PublicReview[]> => (await listReviews("approved")).map(toPublic),
  ["reviews:approved:v1"],
  { tags: [REVIEWS_TAG], revalidate: 300 },
);

/** Last good read in this server instance, so a storage outage keeps the reviews already shown. */
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

/** Moves a review to another folder (approve, reject, restore). */
export async function moveReview(file: string, from: ReviewStatus, to: ReviewStatus): Promise<boolean> {
  if (from === to || !/^[0-9TZ]+_[0-9a-f-]{36}\.json$/.test(file)) return false;
  const { error } = await createAdminClient().storage.from(REVIEWS_BUCKET).move(`${from}/${file}`, `${to}/${file}`);
  if (error) console.error("[reviews] move failed", { file, from, to }, error.message);
  return !error;
}

/** Deletes a review and its photo for good. */
export async function deleteReview(file: string, status: ReviewStatus): Promise<boolean> {
  const m = file.match(/^[0-9TZ]+_([0-9a-f-]{36})\.json$/);
  if (!m) return false;
  const storage = createAdminClient().storage.from(REVIEWS_BUCKET);
  const { data: blob } = await storage.download(`${status}/${file}`);
  const stored = blob ? parse(await blob.text()) : null;
  const { data, error } = await storage.remove([`${status}/${file}`, ...(stored?.photo ? [stored.photo] : [])]);
  if (error || !data?.length) {
    console.error("[reviews] delete failed", { file, status }, error?.message ?? "nothing removed");
    return false;
  }
  return true;
}

/** Short-lived links to pending/rejected photos for the moderation screen (the bucket is private). */
export async function signedPhotoUrls(reviews: StoredReview[]): Promise<Record<string, string>> {
  const paths = reviews.flatMap((r) => (r.photo ? [r.photo] : []));
  if (!paths.length) return {};
  const { data } = await createAdminClient().storage.from(REVIEWS_BUCKET).createSignedUrls(paths, 600);
  const out: Record<string, string> = {};
  for (const d of data ?? []) {
    const id = d.path?.match(PHOTO_PATH)?.[1];
    if (id && d.signedUrl) out[id] = d.signedUrl;
  }
  return out;
}

/** How many reviews wait in a folder, without downloading them (the admin nav badge). */
export async function countReviews(status: ReviewStatus): Promise<number> {
  const { data, error } = await createAdminClient().storage.from(REVIEWS_BUCKET).list(status, { limit: LIST_LIMIT });
  if (error) return 0;
  return (data ?? []).filter((f) => f.name.endsWith(".json")).length;
}
