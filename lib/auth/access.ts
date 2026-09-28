import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Whether the given user is an admin (has a row in `admins`). Runs as the
 * signed-in user, so it is also subject to RLS (admins can read their own row).
 */
export async function checkIsAdmin(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("admins")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data);
}
