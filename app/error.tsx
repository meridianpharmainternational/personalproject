"use client";

import { startTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

/**
 * Error boundary for every page under the root layout, e.g. a product page
 * while the catalogue can't be read. The header, footer and enquiry list stay
 * usable around it. "Try again" refetches the server render before resetting:
 * reset() on its own would re-render the same failed payload.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
    <section className="section" aria-labelledby="error-title">
      <div className="container-grid">
        <p className="kicker">Something went wrong</p>
        <h1 id="error-title" className="mt-4 max-w-4xl">
          This page couldn&rsquo;t load
        </h1>
        <p className="lead mt-4">
          The catalogue may be temporarily unavailable. Please try again in a moment, or go back to the full
          catalogue.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={retry}>
            Try again
          </button>
          <Link className="btn btn-secondary w-full sm:w-auto" href="/medicines">
            Browse the catalogue
            <ArrowRight aria-hidden strokeWidth={1.75} className="icon-trail" />
          </Link>
        </div>
      </div>
    </section>
  );
}
