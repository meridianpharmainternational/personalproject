"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Menu, Search, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { ProductSearch } from "@/components/search/product-search";
import { MobileNav } from "@/components/mobile-nav";
import { NavigationProgress } from "@/components/navigation-progress";
import type { NavData } from "@/components/category-bar";
import { forgetCatalogueOrigin } from "@/components/catalog/back-to-results";
import { enquiryList, useEnquiryList } from "@/lib/enquiry-list";
import { useDialog } from "@/lib/use-dialog";
import { site } from "@/lib/site";

export function SiteHeader({
  nav,
  popular,
}: {
  nav: NavData;
  popular: { name: string; count: number }[];
}) {
  const pathname = usePathname() ?? "";
  const { items, open: listOpen } = useEnquiryList();
  const n = items.length;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bumped, setBumped] = useState(false);
  const prevN = useRef(n);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // Pop the count badge whenever the list grows.
  useEffect(() => {
    const grew = n > prevN.current;
    prevN.current = n;
    if (!grew) return;
    setBumped(true);
    const t = window.setTimeout(() => setBumped(false), 340);
    return () => window.clearTimeout(t);
  }, [n]);

  useEffect(() => {
    setMenuOpen(false);
    setSheetOpen(false);
    // A saved catalogue view only matters inside the /medicines flow (list and
    // product pages); drop it once the buyer navigates anywhere else.
    if (!/^\/medicines(\/|$)/.test(pathname)) forgetCatalogueOrigin();
  }, [pathname]);

  // Opening the enquiry list (e.g. "View list" in the toast while the mobile
  // search sheet is up) must close the header's own overlays first. Otherwise
  // the drawer (z 61) opens underneath the sheet (z 62) and its useDialog makes
  // the sheet inert, leaving a frozen screen. The sheet's useDialog cleanup
  // runs before the drawer's useDialog setup in the same commit, so the drawer
  // takes over inert/focus/scroll-lock cleanly.
  useEffect(() => {
    if (!listOpen) return;
    setSheetOpen(false);
    setMenuOpen(false);
  }, [listOpen]);

  const isStaffArea = pathname.startsWith("/admin") || pathname.startsWith("/login");
  // The catalogue page has its own search box; a second one in the header would only compete with it.
  const onCatalogue = pathname === "/medicines";

  return (
    <>
      <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
        {/* Page-change bar on the header’s bottom edge (useSearchParams, so it needs Suspense). */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <div className="container-grid site-header-inner">
          <Logo />
          <nav className="nav ml-4" aria-label="Main">
            {site.nav.map((i) => (
              <Link
                key={i.href}
                className="nav-link"
                href={i.href}
                aria-current={pathname === i.href || pathname.startsWith(`${i.href}/`) ? "page" : undefined}
              >
                {i.label}
              </Link>
            ))}
          </nav>

          {!isStaffArea && (
            <>
              {onCatalogue ? (
                <span className="ml-auto" aria-hidden="true" />
              ) : (
                <>
                  <button
                    type="button"
                    className="icon-btn icon-btn-bare search-toggle"
                    aria-label="Search products"
                    onClick={() => setSheetOpen(true)}
                  >
                    <Search aria-hidden />
                  </button>
                  <ProductSearch mode="popover" total={nav.total} />
                </>
              )}
              <button
                type="button"
                className="enq-btn"
                onClick={() => enquiryList.open()}
                aria-label={`Enquiry list, ${n} product${n === 1 ? "" : "s"}`}
              >
                <ClipboardList aria-hidden />
                <span className="enq-btn-label">Enquiry list</span>
                <span className={`count-badge${bumped ? " is-bumped" : ""}`} data-empty={n === 0 ? "" : undefined} aria-hidden>
                  {n}
                </span>
              </button>
            </>
          )}

          <button
            type="button"
            className={`icon-btn icon-btn-bare menu-toggle lg:hidden${isStaffArea ? " ml-auto" : ""}`}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu aria-hidden />
          </button>
        </div>
      </header>

      {menuOpen && (
        <MobileNav
          nav={nav}
          onClose={() => setMenuOpen(false)}
        />
      )}
      {sheetOpen && <SearchSheet total={nav.total} popular={popular} onClose={() => setSheetOpen(false)} />}
    </>
  );
}

function SearchSheet({
  total,
  popular,
  onClose,
}: {
  total: number;
  popular: { name: string; count: number }[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Fallback when the opener can't take focus back: the header's search button.
  useDialog(true, ref, onClose, undefined, () => document.querySelector<HTMLElement>(".search-toggle"));
  return (
    <div ref={ref} data-dialog-root>
      <div className="search-sheet overflow-y-auto" role="dialog" aria-modal="true" aria-label="Search products">
        <div className="flex min-h-16 items-center justify-between gap-3 border-b border-rule px-4">
          <p className="text-h4 font-semibold text-fg-strong">Search products</p>
          <button type="button" className="icon-btn icon-btn-bare" aria-label="Close search" onClick={onClose}>
            <X aria-hidden />
          </button>
        </div>
        <div className="p-4">
          <ProductSearch mode="sheet" total={total} popular={popular} autoFocus onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}
