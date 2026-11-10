"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { REVIEWS_TAG, REVIEW_STATUSES, deleteReview, updateReviewStatus, type ReviewStatus } from "@/lib/reviews";

/** `ok` is false when the write failed or matched no row, so the button can say so instead of announcing a change. */
type ReviewActionResult = { ok: boolean };

const isStatus = (s: string): s is ReviewStatus => (REVIEW_STATUSES as readonly string[]).includes(s);

/** The public pages (home carousel, /reviews) and the photo route read approved reviews through this tag. */
function refresh() {
  revalidateTag(REVIEWS_TAG);
  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
}

/** Approve (publish), reject or hide, and restore. */
export async function setReviewStatus(id: string, status: string): Promise<ReviewActionResult> {
  await requireAdmin();
  if (!isStatus(status)) return { ok: false };
  const ok = await updateReviewStatus(id, status);
  if (ok) refresh();
  return { ok };
}

export async function removeReview(id: string): Promise<ReviewActionResult> {
  await requireAdmin();
  const ok = await deleteReview(id);
  if (ok) refresh();
  return { ok };
}
