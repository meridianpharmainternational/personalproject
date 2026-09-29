"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";

/**
 * Sign out posts a plain form to /auth/signout (a full page load), so the
 * button shows it is working until the browser leaves the page.
 */
export function SignOutButton() {
  const [pending, setPending] = useState(false);

  // Coming back with the browser's Back button can restore this page as it
  // was left (the back/forward cache), so reset the button then.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  return (
    <form action="/auth/signout" method="post" onSubmit={() => setPending(true)}>
      <button type="submit" className="btn btn-secondary btn-sm" disabled={pending} aria-busy={pending || undefined}>
        {pending ? <span className="spinner" aria-hidden="true" /> : <LogOut aria-hidden="true" />}
        {pending ? "Signing out…" : "Sign out"}
      </button>
    </form>
  );
}
