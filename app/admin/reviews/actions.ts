"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { REVIEWS_TAG, REVIEW_STATUSES, deleteReview, moveReview, type ReviewStatus } from "@/lib/reviews";

/** `ok` is false when the move or delete failed, so the button can say so instead of announcing a change. */
type ReviewActionResult = { ok: boolean };

const isStatus = (s: string): s is ReviewStatus => (REVIEW_STATUSES as readonly string[]).includes(s);

/** The public pages (home carousel, /reviews) and the photo route read approved reviews through this tag. */
function refresh() {
  revalidateTag(REVIEWS_TAG);
  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
}

/** Approve, reject or restore: moves the review between the moderation folders. */
export async function setReviewStatus(file: string, from: string, to: string): Promise<ReviewActionResult> {
  await requireAdmin();
  if (!isStatus(from) || !isStatus(to)) return { ok: false };
  const ok = await moveReview(file, from, to);
  if (ok) refresh();
  return { ok };
}

export async function removeReview(file: string, status: string): Promise<ReviewActionResult> {
  await requireAdmin();
  if (!isStatus(status)) return { ok: false };
  const ok = await deleteReview(file, status);
  if (ok) refresh();
  return { ok };
}
