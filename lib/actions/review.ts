"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { REVIEWS_BUCKET, ensureReviewsBucket } from "@/lib/reviews";
import { REVIEW_LIMITS, reviewSchema } from "@/lib/validations/review";
import type { ReviewInsert } from "@/types/db";

export type ReviewResult = { ok: boolean; error?: string };

/** Same meaningless honeypot name as the enquiry forms (see lib/actions/enquiry.ts). */
const HONEYPOT_FIELD = "mp_extra_7";

/** At most this many reviews per address per window, per server instance: enough for a buyer, too few for a flood. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const recent = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) {
    recent.set(ip, hits);
    return true;
  }
  hits.push(now);
  recent.set(ip, hits);
  // Keep the map from growing without bound on a long-lived instance.
  if (recent.size > 5000) recent.clear();
  return false;
}

/** Read a FormData field as text. Files and missing fields read as "". */
function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

/** The image type from the file's first bytes (never the browser's claim), or null. */
function sniff(bytes: Uint8Array): { ext: "jpg" | "png" | "webp"; type: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return { ext: "png", type: "image/png" };
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff === "RIFF" && webp === "WEBP") return { ext: "webp", type: "image/webp" };
  return null;
}

/**
 * Public review submission. The review is validated here (the form's checks are
 * a convenience), inserted as PENDING into public.reviews with the server-only
 * service role (the table is not publicly writable), and appears
 * on the site only after an admin approves it (app/admin/reviews). A filled
 * honeypot does not drop the review: it is stored flagged so the admin sees it,
 * and the reply is the same either way.
 */
export async function submitReview(formData: FormData): Promise<ReviewResult> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return { ok: false, error: "You have sent several reviews in a short time. Please try again later." };
  }

  const parsed = reviewSchema.safeParse({
    rating: text(formData, "rating"),
    name: text(formData, "name"),
    company: text(formData, "company"),
    country: text(formData, "country"),
    email: text(formData, "email"),
    comment: text(formData, "comment"),
    consent: text(formData, "consent") === "yes",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your review and try again." };
  }
  const d = parsed.data;

  // Optional photo: checked by size and by its real type.
  const file = formData.get("photo");
  let photo: { bytes: Uint8Array; ext: string; type: string } | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > REVIEW_LIMITS.photoBytes) {
      return { ok: false, error: "Your photo is too large. Please choose one under 2 MB." };
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniff(bytes);
    if (!kind) return { ok: false, error: "Please choose a JPG, PNG or WebP photo." };
    photo = { bytes, ...kind };
  }

  // The id is chosen here so the photo can be stored under it before the row exists.
  const id = randomUUID();
  const review: ReviewInsert = {
    id,
    name: d.name,
    company: d.company || null,
    country: d.country || null,
    email: d.email || null,
    rating: d.rating,
    comment: d.comment,
    photo_path: photo ? `photos/${id}.${photo.ext}` : null,
    status: "pending",
    flagged: text(formData, HONEYPOT_FIELD).trim() !== "",
  };

  try {
    const admin = createAdminClient();
    if (photo && review.photo_path) {
      await ensureReviewsBucket();
      const { error } = await admin.storage
        .from(REVIEWS_BUCKET)
        .upload(review.photo_path, photo.bytes, { contentType: photo.type, upsert: false });
      if (error)
        return { ok: false, error: "We couldn’t upload your photo. Please try again, or send the review without it." };
    }
    const { error } = await admin.from("reviews").insert(review);
    if (error) {
      console.error("[reviews] insert failed", error.message);
      if (review.photo_path) await admin.storage.from(REVIEWS_BUCKET).remove([review.photo_path]);
      return { ok: false, error: "We couldn’t send your review. Please try again." };
    }
  } catch {
    return { ok: false, error: "We couldn’t send your review. Please try again." };
  }
  return { ok: true };
}
