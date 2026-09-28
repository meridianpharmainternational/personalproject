import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * ⚠️  SERVER-ONLY Supabase client that uses the SERVICE ROLE key.
 *
 * This client BYPASSES Row Level Security and can read/write ANY row. Treat the
 * service role key like a root password.
 *
 * The `import "server-only"` at the top makes the build FAIL if this module is
 * ever pulled into a Client Component ("use client") or any browser bundle.
 * Combined with the fact that SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_
 * prefix, the key can never reach the browser.
 *
 * Use ONLY inside Server Actions / Route Handlers for trusted operations, e.g.
 * onboarding a new buyer (upload the license document + insert the buyers row
 * before a session exists when email confirmation is enabled).
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
