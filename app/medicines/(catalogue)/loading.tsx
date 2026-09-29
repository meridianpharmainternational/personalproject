"use client";

import { useEffect } from "react";
import { announce } from "@/lib/ui-store";

/**
 * Suspense fallback for the catalogue (/medicines) while it streams in: first
 * load, and links that change its params (category bar, header search). No
 * data: static placeholders built from the real layout classes (page head,
 * toolbar band, sidebar, rows / results-grid), so nothing moves when the
 * catalogue replaces them. Phones show list rows and wider screens cards,
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
        <CatalogueSkeleton />
      </div>
    </>
  );
}

/** A bar inside its parent's line box, so each placeholder line is exactly as tall as the real line. */
function Line({ className }: { className: string }) {
  return <span className={`skeleton inline-block h-[0.875em] max-w-full align-middle ${className}`} />;
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function CatalogueSkeleton() {
  return (
    <>
      <div className="page-head bg-mercator bg-columns pb-5 pt-4 lg:pb-7 lg:pt-6">
        <div className="container-grid lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-end lg:gap-x-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,36rem)]">
          <div className="min-w-0">
            {/* Breadcrumb row (its links are 44px tall), h1 at the h2 size, meta line. */}
            <div className="crumbs min-h-tap">
              <span className="skeleton h-4 w-36" />
            </div>
            <div className="mt-2 text-h2 lg:mt-3">
              <Line className="w-[9em]" />
            </div>
            {/* Transparent sample text so the line wraps where the real counts do (two lines on phones). */}
            <p className="kicker mt-4">
              <span className="skeleton box-decoration-clone text-transparent">
                000 products · 0 categories · 00 molecules
              </span>
            </p>
          </div>
          <div className="skeleton mt-4 h-14 max-w-2xl lg:mt-0" />
        </div>
      </div>

      <div className="toolbar-band">
        <div className="container-grid results-toolbar">
          <span className="skeleton hidden h-5 w-44 lg:block" />
          <div className="flex w-full items-center gap-1.5 lg:ml-auto lg:w-auto lg:gap-3">
            <span className="skeleton h-11 w-24 lg:hidden" />
            <span className="skeleton hidden h-4 w-14 lg:block" />
            <span className="skeleton h-11 min-w-0 flex-1 lg:w-44 lg:flex-none" />
            <span className="skeleton h-11 w-[5.625rem] flex-none" />
            <span className="skeleton hidden h-11 w-36 lg:block" />
          </div>
        </div>
      </div>

      <div className="container-grid pb-8 pt-4 md:py-8 lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-8">
        <div className="hidden self-start lg:block">
          <div className="flex min-h-[52px] items-center">
            <span className="skeleton h-6 w-20" />
          </div>
          {[6, 3].map((rows, g) => (
            <div key={g} className="filter-group pb-4">
              <div className="flex min-h-[52px] items-center">
                <span className="skeleton h-5 w-32" />
              </div>
              {range(rows).map((i) => (
                <div key={i} className="flex min-h-tap items-center gap-3">
                  <span className="skeleton h-5 w-5 flex-none" />
                  <span className="skeleton h-4 flex-1" />
                  <span className="skeleton h-4 w-6 flex-none" />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="min-w-0">
          <p className="results-count mb-3 lg:hidden">
            <Line className="w-44" />
          </p>

          <div className="border-t border-rule md:hidden">
            {range(8).map((i) => (
              <div key={i} className="prow">
                <span className="skeleton h-16 w-16" />
                <div className="min-w-0">
                  <p className="prow-title">
                    <Line className="w-40" />
                  </p>
                  <p className="prow-sub">
                    <Line className="w-56" />
                  </p>
                </div>
                <span className="skeleton h-11 w-11" />
              </div>
            ))}
          </div>

          <div className="results-grid hidden md:grid">
            {range(6).map((i) => (
              <div key={i} className="pcard">
                <div className="pcard-media">
                  <span className="skeleton absolute inset-3" />
                </div>
                <div className="pcard-body">
                  <p className="pcard-cat">
                    <Line className="w-28" />
                  </p>
                  <p className="pcard-title block">
                    <Line className="w-4/5" />
                  </p>
                  <p className="pcard-molecule">
                    <Line className="w-3/5" />
                  </p>
                  <div className="pcard-meta">
                    <span className="skeleton h-6 w-16" />
                    <span className="skeleton h-6 w-16" />
                  </div>
                  <p className="pcard-spec">
                    <Line className="w-full" />
                  </p>
                  <div className="pcard-actions">
                    <span className="skeleton h-11 flex-1" />
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
