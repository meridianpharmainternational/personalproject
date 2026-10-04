import type { ReactNode } from "react";

/**
 * Shared shell for the legal pages (terms, privacy, disclaimer):
 * a plain `.page-head` (h1, lead) and a `.doc` body (68ch) with h2 sections.
 * The other legal pages are linked from the footer.
 */
export function LegalPage({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  /** Lead paragraph under the h1. */
  intro?: ReactNode;
  /** "Last updated" date. Shown only when provided — never a placeholder. */
  updated?: string;
  /** This page's href (e.g. "/terms"). Kept for callers; the footer links every legal page. */
  current?: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className="page-head">
        <div className="container-grid">
          <h1 className="max-w-4xl">{title}</h1>
          {intro && <p className="lead mt-4">{intro}</p>}
          {updated && <p className="mt-4 text-sm text-fg-muted">Last updated {updated}</p>}
        </div>
      </header>

      <section className="section">
        <div className="container-grid">
          <article className="doc [&>:first-child]:mt-0">{children}</article>
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
