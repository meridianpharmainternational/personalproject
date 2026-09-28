import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components (the browser).
 *
 * Uses the anon/publishable key only. Row Level Security is what protects data;
 * this key is safe to ship to the browser.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
