import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 *
 * Uses the anon key + the request's auth cookies, so all queries run AS THE
 * SIGNED-IN USER and are subject to Row Level Security.
 *
 * `cookies()` is async in Next.js 15, hence `await` + an async factory.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` was called from a Server Component, which cannot write
            // cookies. Safe to ignore: the middleware refreshes the session on
            // every request, so tokens stay fresh regardless.
          }
        },
      },
    },
  );
}
