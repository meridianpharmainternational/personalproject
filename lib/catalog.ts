import { createClient } from "@/lib/supabase/server";
import type { Category, MedicineWithCategory } from "@/types/db";

/**
 * Public catalog reads (active medicines only). Everything is wrapped so a
 * missing/placeholder Supabase config degrades to empty results and the public
 * pages still render (with an empty state) instead of crashing.
 */

const MED_SELECT = "*, category:categories(id, slug, name)";

export async function getCategories(): Promise<Category[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) return [];
    return (data as Category[]) ?? [];
  } catch {
    return [];
  }
}

export async function getMedicines(): Promise<MedicineWithCategory[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("medicines")
      .select(MED_SELECT)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) return [];
    return (data as unknown as MedicineWithCategory[]) ?? [];
  } catch {
    return [];
  }
}

export async function getMedicineById(
  id: string,
): Promise<MedicineWithCategory | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("medicines")
      .select(MED_SELECT)
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) return null;
    return (data as unknown as MedicineWithCategory) ?? null;
  } catch {
    return null;
  }
}
