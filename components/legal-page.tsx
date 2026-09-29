import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { site } from "@/lib/site";

/**
 * Shared shell for the legal pages (terms, privacy, disclaimer):
 * `.page-head` (crumbs, h1, lead) + a `.doc` body (68ch) with h2 sections and a
 * small aside linking the other legal pages. No scroll-reveal: legal text is
 * always visible.
 */
export function LegalPage({
  title,
  intro,
  updated,
  current,
  children,
}: {
  title: string;
  /** Lead paragraph under the h1. */
  intro?: ReactNode;
  /** "Last updated" date. Shown only when provided — never a placeholder. */
  updated?: string;
  /** This page's href (e.g. "/terms"), to mark it in the aside. */
  current?: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className="page-head bg-mercator">
        <div className="container-grid">
          <nav aria-label="Breadcrumb">
            <ol className="crumbs">
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <span aria-current="page">{title}</span>
              </li>
            </ol>
          </nav>
          <h1 className="mt-2 max-w-4xl">{title}</h1>
          {intro && <p className="lead mt-4">{intro}</p>}
          {updated && <p className="kicker mt-6">Last updated {updated}</p>}
        </div>
      </header>

      <section className="section">
        <div className="container-grid grid-12 items-start">
          <article className="doc col-span-full lg:col-span-8 [&>:first-child]:mt-0">{children}</article>

          <aside
            aria-label="Legal information"
            className="col-span-full mt-8 lg:col-span-3 lg:col-start-10 lg:mt-0 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]"
          >
            <p className="kicker border-t border-navy-900 pt-3">Legal</p>
            <ul className="mt-2 border-t border-rule">
              {site.legal.map((l) => (
                <li key={l.href} className="border-b border-rule">
                  <Link
                    href={l.href}
                    aria-current={current === l.href ? "page" : undefined}
                    className={`flex min-h-tap items-center py-2 ${
                      current === l.href ? "font-semibold text-fg-strong" : "text-navy-600 underline decoration-transparent hover:decoration-current"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="panel mt-6">
              <h2 className="font-sans text-h4">Questions?</h2>
              <p className="mt-2 text-fg-muted">Our team can clarify anything on these pages.</p>
              <Link href="/contact" className="link-arrow mt-2">
                Contact us <ArrowRight aria-hidden className="icon-trail" />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

/**
 * One h2 section of a legal document. Rendered as direct children of `.doc` so
 * its spacing rules apply. Plain-text children are wrapped in a <p>; pass
 * elements (<p>, <ul>) for richer content.
 */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const isText = typeof children === "string" || typeof children === "number";
  return (
    <>
      <h2>{title}</h2>
      {isText ? <p>{children}</p> : children}
    </>
  );
}
