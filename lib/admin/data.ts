import { createClient } from "@/lib/supabase/server";
import type { Category, Enquiry, MedicineWithCategory } from "@/types/db";

/**
 * Admin reads. These run as the signed-in admin (RLS admin policies allow
 * reading ALL medicines incl. inactive, and all enquiries). Call only from
 * pages/actions already protected by requireAdmin().
 *
 * A failed read THROWS (the route's error boundary renders) instead of
 * resolving to empty results: an outage, network blip or RLS/permission error
 * must never read as "No enquiries yet", "Inbox is clear" or "No medicines
 * yet" — the last of which invites re-adding products that still exist.
 */

const MED_SELECT = "*, category:categories(id, slug, name)";

/** Postgres `invalid_text_representation`, e.g. a malformed uuid in the URL. */
const INVALID_TEXT = "22P02";

function readFailed(what: string, error: { message: string }): never {
  throw new Error(`Couldn't load ${what}: ${error.message}`);
}

export async function adminGetMedicines(): Promise<MedicineWithCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("medicines")
    .select(MED_SELECT)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) readFailed("medicines", error);
  return (data ?? []) as unknown as MedicineWithCategory[];
}

/**
 * The medicine with this id, or `null` when there is none (the route answers
 * 404), including for an id that isn't a valid uuid. Throws when the read
 * itself fails, so an outage is never shown as "not found".
 */
export async function adminGetMedicine(
  id: string,
): Promise<MedicineWithCategory | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("medicines")
    .select(MED_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (error.code === INVALID_TEXT) return null;
    readFailed("the medicine", error);
  }
  return (data as unknown as MedicineWithCategory | null) ?? null;
}

export async function adminGetCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) readFailed("categories", error);
  return (data ?? []) as Category[];
}

/**
 * Most enquiries the inbox loads in one read. Supabase's PostgREST caps a
 * response at 1000 rows by default, so asking for more would be cut silently;
 * `total` below reports the real size so any truncation is visible.
 */
export const INBOX_LIMIT = 1000;

export type EnquiryInboxData = {
  /** Newest first, at most INBOX_LIMIT rows. */
  enquiries: Enquiry[];
  /** Exact number of enquiries stored; greater than `enquiries.length` when the list is truncated. */
  total: number;
  /** Exact number with status "new", across all enquiries (not only the loaded rows). */
  newTotal: number;
};

export async function adminGetEnquiryInbox(): Promise<EnquiryInboxData> {
  const supabase = await createClient();
  const [list, fresh] = await Promise.all([
    supabase
      .from("enquiries")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(0, INBOX_LIMIT - 1),
    supabase
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
  ]);
  if (list.error) readFailed("enquiries", list.error);
  if (fresh.error) readFailed("enquiries", fresh.error);

  const enquiries = (list.data ?? []) as Enquiry[];
  return {
    enquiries,
    total: list.count ?? enquiries.length,
    newTotal: fresh.count ?? enquiries.filter((e) => e.status === "new").length,
  };
}

/** The inbox rows only (newest first, at most INBOX_LIMIT); prefer adminGetEnquiryInbox for the counts. */
export async function adminGetEnquiries(): Promise<Enquiry[]> {
  return (await adminGetEnquiryInbox()).enquiries;
}

export async function adminCounts(): Promise<{
  medicines: number;
  activeMedicines: number;
  enquiries: number;
  newEnquiries: number;
}> {
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
  const failed = [meds, activeMeds, enq, newEnq].find((r) => r.error)?.error;
  if (failed) readFailed("admin counts", failed);
  return {
    medicines: meds.count ?? 0,
    activeMedicines: activeMeds.count ?? 0,
    enquiries: enq.count ?? 0,
    newEnquiries: newEnq.count ?? 0,
  };
}
