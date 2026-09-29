"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- plain anchors on purpose: a full page load re-runs the root layout that failed, a client navigation would not. */

import { useEffect, type CSSProperties } from "react";
import { site } from "@/lib/site";

/*
 * Last-resort boundary for a failure in the root layout itself. It replaces
 * the layout, so neither globals.css nor the self-hosted fonts can be relied
 * on: everything here is inline, on system fonts, in the brand navy.
 */
const NAVY = "#0f2350";

const s = {
  body: {
    margin: 0,
    minHeight: "100vh",
    background: "#ffffff",
    color: "#26324d",
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    fontSize: 17,
    lineHeight: 1.6,
  },
  bar: {
    display: "flex",
    alignItems: "center",
    minHeight: 64,
    padding: "0 16px",
    background: NAVY,
  },
  brand: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 44,
    color: "#ffffff",
    fontWeight: 600,
    textDecoration: "none",
  },
  main: { maxWidth: 720, margin: "0 auto", padding: "64px 16px 96px" },
  kicker: {
    margin: 0,
    fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#4a5670",
  },
  h1: {
    margin: "16px 0 0",
    fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
    fontSize: "clamp(2rem, 1.6rem + 2vw, 3rem)",
    fontWeight: 600,
    lineHeight: 1.1,
    color: NAVY,
  },
  lead: { margin: "16px 0 0", maxWidth: "60ch", color: "#4a5670" },
  actions: { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "0 20px",
    border: `1px solid ${NAVY}`,
    borderRadius: 2,
    fontFamily: "inherit",
    fontSize: 17,
    fontWeight: 600,
    lineHeight: 1.2,
    textDecoration: "none",
    cursor: "pointer",
  },
  primary: { background: NAVY, color: "#ffffff" },
  secondary: { background: "#ffffff", color: NAVY },
} satisfies Record<string, CSSProperties>;

export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={s.body}>
        <title>{`Something went wrong · ${site.name}`}</title>
        <div style={s.bar}>
          <a href="/" style={s.brand}>
            {site.fullName}
          </a>
        </div>
        <main style={s.main}>
          <p style={s.kicker}>Something went wrong</p>
          <h1 style={s.h1}>This page couldn&rsquo;t load</h1>
          <p style={s.lead}>
            The catalogue may be temporarily unavailable. Please try again in a moment, or go back to the full
            catalogue.
          </p>
          <div style={s.actions}>
            {/* A reload, not reset(): the layout's failed server render would just be shown again. */}
            <button type="button" style={{ ...s.btn, ...s.primary }} onClick={() => window.location.reload()}>
              Try again
            </button>
            <a href="/medicines" style={{ ...s.btn, ...s.secondary }}>
              Browse the catalogue
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
