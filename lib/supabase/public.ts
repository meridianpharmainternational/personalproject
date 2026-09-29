import { createClient } from "@supabase/supabase-js";

/**
 * Cookie-less, session-less Supabase client for PUBLIC catalog reads.
 *
 * Uses only the anon key, so Row Level Security applies (active medicines and
 * categories are publicly readable). Because it never touches cookies it can be
 * used inside `unstable_cache`, which lets public pages be cached and served
 * statically instead of re-querying all products on every request.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
