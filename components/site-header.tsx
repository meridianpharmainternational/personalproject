"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { EnquiryButton } from "@/components/enquiry/enquiry-button";
import { site } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={`material sticky top-0 z-50 transition-shadow duration-300 ${
        scrolled ? "shadow-soft" : ""
      }`}
    >
      <div className="container-page flex h-20 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {site.nav.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={`nav-link ${isActive(i.href) ? "active" : ""}`}
            >
              {i.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <EnquiryButton className="btn btn-primary" label="Get a quote" />
        </div>

        <button
          className="grid h-10 w-10 place-items-center rounded-lg text-brand-800 hover:bg-brand-50 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-brand-100 bg-white/95 backdrop-blur md:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {site.nav.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className={`rounded-lg px-3 py-2.5 font-medium ${
                  isActive(i.href)
                    ? "bg-brand-50 text-brand-800"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {i.label}
              </Link>
            ))}
            <EnquiryButton className="btn btn-primary mt-2 w-full" label="Get a quote" />
          </div>
        </div>
      )}
    </header>
  );
}
