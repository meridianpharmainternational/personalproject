"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { enquirySchema } from "@/lib/validations/enquiry";
import { sendEnquiryNotification } from "@/lib/email";
import type { EnquiryInsert } from "@/types/db";

export type EnquiryResult = { ok: boolean; error?: string };

/**
 * Public enquiry submission (contact form + per-product modal).
 * Inserts via the SERVER-ONLY service-role client, so the `enquiries` table is
 * not publicly writable — the insert only happens here, after validation.
 * Then fires an optional email notification (no-op if not configured).
 */
export async function submitEnquiry(
  formData: FormData,
): Promise<EnquiryResult> {
  const parsed = enquirySchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    country: formData.get("country") ?? "",
    company: formData.get("company") ?? "",
    product: formData.get("product") ?? "",
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const d = parsed.data;
  const record: EnquiryInsert = {
    source: (formData.get("source") as string) || "Contact Form",
    name: d.name,
    email: d.email,
    phone: d.phone || null,
    country: d.country || null,
    company: d.company || null,
    product: d.product || null,
    message: d.message || null,
    page: (formData.get("page") as string) || null,
  };

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("enquiries").insert(record);
    if (error) {
      return { ok: false, error: "Could not send your enquiry. Please try again." };
    }
  } catch {
    return { ok: false, error: "Could not send your enquiry. Please try again." };
  }

  await sendEnquiryNotification(record);
  return { ok: true };
}
