"use client";

import { useEffect } from "react";
import { announce } from "@/lib/ui-store";

/**
 * Suspense fallback for the catalogue (/medicines) while it streams in: first
 * load, and links that change its params (category bar, header search). No
 * data: static placeholders built from the real layout classes (page head,
 * filter row, rows / results-grid), so nothing moves when the catalogue
 * replaces them. Phones show list rows and wider screens cards,
 * matching the catalogue's first paint.
 *
 * Belongs in the (catalogue) route group next to the catalogue's page.tsx,
 * not directly in app/medicines/. A loading.tsx wraps every route below it in
 * a Suspense boundary, so product pages (/medicines/[id]) would stream after
 * the 200 status is sent. A missing product (notFound()) or a catalogue outage
 * (getMedicineById's strict throw) could then no longer answer 404 / 5xx.
 * Don't put a loading.tsx above app/medicines/[id].
 *
 * The placeholder is aria-hidden. The loading message goes through the
 * persistent <LiveRegion/> (a live region mounted together with its text is
 * rarely announced), and only when loading takes longer than 300ms. The
 * sr-only line stays so a screen reader reading the page meanwhile finds it.
 *
 * Keep the catalogue head in step with app/medicines/(catalogue)/page.tsx and
 * components/catalog/catalogue-head.tsx.
 */
export default function MedicinesLoading() {
  useEffect(() => {
    const t = window.setTimeout(() => announce("Loading catalogue…"), 300);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      <p className="sr-only">Loading catalogue…</p>
      <div aria-hidden="true" className="pointer-events-none select-none">
        <div className="page-head">
          <div className="container-grid lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-end lg:gap-x-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,36rem)]">
            <div className="text-h2">
              <span className="skeleton inline-block h-[0.8em] w-56 align-middle" />
            </div>
            <div className="skeleton mt-4 h-14 max-w-2xl lg:mt-0" />
          </div>
        </div>
        <div className="container-grid pb-16 pt-6 lg:pt-8">
          <div className="cat-filters-row">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`skeleton h-12${i === 2 ? " cat-filters-sort" : ""}`} />
            ))}
          </div>
          <div className="cat-filters-meta">
            <span className="skeleton h-5 w-32" />
          </div>
          <ul className="mt-6 border-t border-rule md:hidden">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i} className="prow">
                <span className="prow-thumb-ph" />
                <div className="min-w-0 space-y-2">
                  <span className="skeleton block h-5 w-40" />
                  <span className="skeleton block h-4 w-52" />
                </div>
                <span className="skeleton h-11 w-11" />
              </li>
            ))}
          </ul>
          <div className="results-grid mt-6 hidden md:grid">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="pcard">
                <div className="pcard-media" />
                <div className="pcard-body">
                  <span className="skeleton block h-6 w-3/4" />
                  <span className="skeleton block h-5 w-1/2" />
                  <span className="skeleton block h-4 w-2/3" />
                  <div className="pcard-actions">
                    <span className="skeleton h-11 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
