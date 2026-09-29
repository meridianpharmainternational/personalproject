"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EnquiryStatus } from "@/types/db";

/**
 * Result of an admin enquiry mutation. `ok` is false when the write failed or
 * matched no row (e.g. the enquiry was already deleted), so the caller can
 * report failure instead of announcing a change that did not happen.
 */
type EnquiryActionResult = { ok: boolean };

export async function setEnquiryStatus(
  id: string,
  status: EnquiryStatus,
): Promise<EnquiryActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("enquiries")
    .update({ status })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    console.error(
      "setEnquiryStatus failed",
      { id, status },
      error ?? "no row updated",
    );
    return { ok: false };
  }
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteEnquiry(id: string): Promise<EnquiryActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("enquiries")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    console.error("deleteEnquiry failed", { id }, error ?? "no row deleted");
    return { ok: false };
  }
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
  return { ok: true };
}
