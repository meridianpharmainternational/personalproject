"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";
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

/** Formats the admin form accepts (its file input's `accept`), by file extension. */
const IMAGE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
/** Vercel caps request bodies at about 4.5 MB; MedicineForm checks the same limit. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

type UploadResult = { path: string | null; error?: string };

/**
 * Stores a product image. `path` is null when no file was chosen; `error` is
 * set when a chosen file could not be stored, so callers can refuse to save
 * the product without the image the admin picked.
 */
async function uploadImage(
  admin: ReturnType<typeof createAdminClient>,
  file: File,
): Promise<UploadResult> {
  if (!file || file.size === 0) return { path: null };
  // Re-check what the form checks: the browser's checks can be bypassed.
  const ext = IMAGE_EXT[file.type];
  if (!ext) return { path: null, error: "Images must be PNG, JPEG or WebP." };
  if (file.size > MAX_IMAGE_BYTES) {
    return { path: null, error: "Images must be 4 MB or smaller." };
  }
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage
    .from("medicine-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { path: null, error: error.message };
  return { path };
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
  const upload: UploadResult =
    image instanceof File ? await uploadImage(admin, image) : { path: null };
  // Never save the product without the image the admin chose.
  if (upload.error) {
    return { ok: false, error: `Image upload failed: ${upload.error}` };
  }
  const image_path = upload.path;

  const { error } = await admin
    .from("medicines")
    .insert({ ...toRow(parsed.data), image_path });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/medicines");
  revalidatePath("/medicines");
  revalidateTag(CATALOG_TAG); // refresh the cached public catalogue immediately
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
  const upload: UploadResult =
    image instanceof File && image.size > 0
      ? await uploadImage(admin, image)
      : { path: null };
  // Never save the changes without the replacement image the admin chose.
  if (upload.error) {
    return { ok: false, error: `Image upload failed: ${upload.error}` };
  }
  const newImagePath = upload.path;

  const row: Record<string, unknown> = {
    ...toRow(parsed.data),
    updated_at: new Date().toISOString(),
  };
  if (newImagePath) row.image_path = newImagePath;

  const { error } = await admin.from("medicines").update(row).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/medicines");
  revalidatePath("/medicines");
  revalidateTag(CATALOG_TAG); // refresh the cached public catalogue immediately
  revalidatePath(`/medicines/${id}`);
  redirect("/admin/medicines");
}

export async function deleteMedicine(id: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("medicines").delete().eq("id", id);
  revalidatePath("/admin/medicines");
  revalidatePath("/medicines");
  revalidateTag(CATALOG_TAG); // refresh the cached public catalogue immediately
}
