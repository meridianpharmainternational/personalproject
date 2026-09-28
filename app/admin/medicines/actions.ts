"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { medicineSchema, type MedicineInput } from "@/lib/validations/medicine";

export type MedicineResult = { ok: boolean; error?: string };

function parse(formData: FormData) {
  return medicineSchema.safeParse({
    name: formData.get("name") ?? "",
    molecule: formData.get("molecule") ?? "",
    category_id: formData.get("category_id") ?? "",
    form: formData.get("form") ?? "",
    strengths: formData.get("strengths") ?? "",
    pack: formData.get("pack") ?? "",
    moq: formData.get("moq") ?? "",
    lead_time: formData.get("lead_time") ?? "",
    availability: (formData.get("availability") as string) || "in-stock",
    description: formData.get("description") ?? "",
    note: formData.get("note") ?? "",
    is_active:
      formData.get("is_active") === "true" || formData.get("is_active") === "on",
    sort_order: formData.get("sort_order") ?? 0,
  });
}

function toRow(d: MedicineInput) {
  return {
    name: d.name,
    molecule: d.molecule || null,
    category_id: d.category_id ? d.category_id : null,
    form: d.form || null,
    strengths: d.strengths || null,
    pack: d.pack || null,
    moq: d.moq || null,
    lead_time: d.lead_time || null,
    availability: d.availability,
    description: d.description || null,
    note: d.note || null,
    is_active: d.is_active,
    sort_order: d.sort_order,
  };
}

async function uploadImage(
  admin: ReturnType<typeof createAdminClient>,
  file: File,
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage
    .from("medicine-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return null;
  return path;
}

export async function createMedicine(
  formData: FormData,
): Promise<MedicineResult> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const admin = createAdminClient();
  const image = formData.get("image");
  const image_path =
    image instanceof File ? await uploadImage(admin, image) : null;

  const { error } = await admin
    .from("medicines")
    .insert({ ...toRow(parsed.data), image_path });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/medicines");
  revalidatePath("/medicines");
  redirect("/admin/medicines");
}

export async function updateMedicine(
  id: string,
  formData: FormData,
): Promise<MedicineResult> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const admin = createAdminClient();
  const image = formData.get("image");
  const newImagePath =
    image instanceof File && image.size > 0
      ? await uploadImage(admin, image)
      : null;

  const row: Record<string, unknown> = {
    ...toRow(parsed.data),
    updated_at: new Date().toISOString(),
  };
  if (newImagePath) row.image_path = newImagePath;

  const { error } = await admin.from("medicines").update(row).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/medicines");
  revalidatePath("/medicines");
  revalidatePath(`/medicines/${id}`);
  redirect("/admin/medicines");
}

export async function deleteMedicine(id: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("medicines").delete().eq("id", id);
  revalidatePath("/admin/medicines");
  revalidatePath("/medicines");
}
