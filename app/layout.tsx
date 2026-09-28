import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RevealObserver } from "@/components/reveal-observer";
import { EnquiryModal } from "@/components/enquiry/enquiry-modal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
};

// Typography uses the platform system font (Apple SF Pro / native), per the
// apple-design guidance — no web-font download needed.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <noscript>
          {/* Without JS, keep scroll-reveal content visible */}
          <style>{`.reveal{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <EnquiryModal />
        <RevealObserver />
      </body>
    </html>
  );
}
