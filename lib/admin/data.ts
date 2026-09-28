import { createClient } from "@/lib/supabase/server";
import type { Category, Enquiry, MedicineWithCategory } from "@/types/db";

/**
 * Admin reads. These run as the signed-in admin (RLS admin policies allow
 * reading ALL medicines incl. inactive, and all enquiries). Call only from
 * pages/actions already protected by requireAdmin().
 */

const MED_SELECT = "*, category:categories(id, slug, name)";

export async function adminGetMedicines(): Promise<MedicineWithCategory[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("medicines")
      .select(MED_SELECT)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    return (data as unknown as MedicineWithCategory[]) ?? [];
  } catch {
    return [];
  }
}

export async function adminGetMedicine(
  id: string,
): Promise<MedicineWithCategory | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("medicines")
      .select(MED_SELECT)
      .eq("id", id)
      .maybeSingle();
    return (data as unknown as MedicineWithCategory) ?? null;
  } catch {
    return null;
  }
}

export async function adminGetCategories(): Promise<Category[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    return (data as Category[]) ?? [];
  } catch {
    return [];
  }
}

export async function adminGetEnquiries(): Promise<Enquiry[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("enquiries")
      .select("*")
      .order("created_at", { ascending: false });
    return (data as Enquiry[]) ?? [];
  } catch {
    return [];
  }
}

export async function adminCounts(): Promise<{
  medicines: number;
  activeMedicines: number;
  enquiries: number;
  newEnquiries: number;
}> {
  try {
    const supabase = await createClient();
    const [meds, activeMeds, enq, newEnq] = await Promise.all([
      supabase.from("medicines").select("id", { count: "exact", head: true }),
      supabase
        .from("medicines")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase.from("enquiries").select("id", { count: "exact", head: true }),
      supabase
        .from("enquiries")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
    ]);
    return {
      medicines: meds.count ?? 0,
      activeMedicines: activeMeds.count ?? 0,
      enquiries: enq.count ?? 0,
      newEnquiries: newEnq.count ?? 0,
    };
  } catch {
    return { medicines: 0, activeMedicines: 0, enquiries: 0, newEnquiries: 0 };
  }
}
