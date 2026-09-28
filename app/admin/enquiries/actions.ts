"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EnquiryStatus } from "@/types/db";

export async function setEnquiryStatus(
  id: string,
  status: EnquiryStatus,
): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("enquiries").update({ status }).eq("id", id);
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
}

export async function deleteEnquiry(id: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("enquiries").delete().eq("id", id);
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
}
