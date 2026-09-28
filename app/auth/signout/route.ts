import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /auth/signout — sign the user out and send them home.
 * Triggered by the sign-out button in the site header.
 * 303 See Other so the browser follows with a GET.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
