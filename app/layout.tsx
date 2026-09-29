import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { CategoryBar, CategoryBarView, type NavData } from "@/components/category-bar";
import { SiteFooter } from "@/components/site-footer";
import { EnquiryDrawer } from "@/components/enquiry/enquiry-drawer";
import { EnquiryBar } from "@/components/enquiry/enquiry-bar";
import { EnquiryToast } from "@/components/enquiry/enquiry-toast";
import { LiveRegion } from "@/components/live-region";
import { RevealObserver } from "@/components/reveal-observer";
import { getCatalogSummary } from "@/lib/catalog";
import { site, siteUrl } from "@/lib/site";

// Self-hosted (app/fonts, SIL Open Font License) so builds and deploys never
// depend on Google Fonts being reachable, and no third-party font request.
const sans = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
});
const serif = localFont({
  src: [{ path: "./fonts/source-serif-4-latin-600-normal.woff2", weight: "600", style: "normal" }],
  variable: "--font-serif",
  display: "swap",
  fallback: ["Georgia", "Cambria", "serif"],
});
const mono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "Menlo", "Consolas", "monospace"],
});

export const metadata: Metadata = {
  // Shared with app/sitemap.ts and app/robots.ts so every absolute URL uses one origin.
  metadataBase: siteUrl,
  title: {
    default: `${site.fullName} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
};

export const viewport: Viewport = {
  themeColor: "#0f2350",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Non-strict on purpose: if the catalogue can't be read, the nav degrades to
  // its empty state instead of every page falling through to global-error.
  const summary = await getCatalogSummary();
  const nav: NavData = {
    total: summary.total,
    categories: summary.categories.map((c) => ({ slug: c.slug, name: c.name, count: c.count })),
  };

  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Gates scroll-reveal so all content stays visible without JavaScript. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader nav={nav} popular={summary.popularMolecules} />
        <Suspense fallback={<CategoryBarView nav={nav} />}>
          <CategoryBar nav={nav} />
        </Suspense>
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter nav={nav} />
        <EnquiryDrawer />
        <EnquiryBar />
        <EnquiryToast />
        <LiveRegion />
        <RevealObserver />
      </body>
    </html>
  );
}
