"use client";

import { startTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Error boundary for the admin pages (dashboard, medicines, enquiries). Admin
 * reads in lib/admin/data.ts throw rather than resolve to empty results, so an
 * outage lands here instead of reading as "No enquiries yet" or "No medicines
 * yet". It renders inside the admin layout's container, so the admin tabs and
 * Sign out stay usable. "Try again" refetches the server render before
 * resetting: reset() on its own would re-render the same failed payload.
 */
export default function AdminErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <section aria-labelledby="admin-error-title">
      <p className="kicker">Something went wrong</p>
      <h1 id="admin-error-title" className="mt-2 text-h2">
        Couldn&rsquo;t load this admin page
      </h1>
      <p className="mt-4 max-w-measure text-base text-fg-muted">
        The database couldn&rsquo;t be reached, so nothing is shown rather than an empty list. Your enquiries and
        medicines are safe. Try again in a moment.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={retry}>
          Try again
        </button>
        <Link className="btn btn-secondary w-full sm:w-auto" href="/admin">
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
