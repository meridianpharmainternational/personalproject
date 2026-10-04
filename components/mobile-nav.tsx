"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MessageCircle, Phone, X } from "lucide-react";
import type { NavData } from "@/components/category-bar";
import { useDialog } from "@/lib/use-dialog";
import { contact, site, whatsappLink } from "@/lib/site";

/** Full-height mobile menu: the categories, company links and contact. */
export function MobileNav({
  nav,
  onClose,
}: {
  nav: NavData;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const pathname = usePathname() ?? "";
  // The menu only mounts after a tap (never during prerender), so reading the
  // query string here is safe and avoids a useSearchParams Suspense bailout.
  // Snapshot on mount: any category link closes the menu, so it can't go stale.
  const [category] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("category") ?? "",
  );
  const onCatalogue = pathname === "/medicines";
  const activeCategory = onCatalogue ? category : null;
  // Fallback when the opener can't take focus back: the header's menu button.
  useDialog(true, ref, onClose, titleRef, () => document.querySelector<HTMLElement>(".menu-toggle"));
  const wa = whatsappLink();

  return (
    <div ref={ref} data-dialog-root>
      <div className="backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="drawer drawer--full" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="drawer-head">
          <h2 id={titleId} ref={titleRef} tabIndex={-1} className="drawer-title outline-0">
            Menu
          </h2>
          <button type="button" className="icon-btn icon-btn-bare" onClick={onClose} aria-label="Close menu">
            <X aria-hidden />
          </button>
        </div>
        <div className="drawer-body !px-0 !pt-0">
          <p className="kicker nav-heading">Products</p>
          {/* Every row closes the menu on tap: on /medicines a category link only
              changes the query string, which the header's pathname effect misses. */}
          <Link
            className="nav-row"
            href="/medicines"
            onClick={onClose}
            aria-current={activeCategory === "" ? "page" : undefined}
          >
            All products
          </Link>
          {nav.categories.map((c) => (
            <Link
              key={c.slug}
              className="nav-row"
              href={`/medicines?category=${c.slug}`}
              onClick={onClose}
              aria-current={activeCategory === c.slug ? "page" : undefined}
            >
              {c.name}
            </Link>
          ))}

          <p className="kicker nav-heading">Company</p>
          {site.nav
            .filter((i) => i.href !== "/medicines")
            .map((i) => (
              <Link
                key={i.href}
                className="nav-row"
                href={i.href}
                onClick={onClose}
                aria-current={pathname === i.href ? "page" : undefined}
              >
                {i.label}
              </Link>
            ))}

          <div className="space-y-2 px-5 py-5">
            {contact.email && (
              <a className="btn btn-secondary btn-block" href={`mailto:${contact.email}`}>
                <Mail aria-hidden /> {contact.email}
              </a>
            )}
            {contact.phoneHref && (
              <a className="btn btn-secondary btn-block" href={contact.phoneHref}>
                <Phone aria-hidden /> {contact.phone}
              </a>
            )}
            {wa && (
              <a className="btn btn-secondary btn-block" href={wa} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden /> WhatsApp
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-2 px-5 pb-8">
            {site.certifications.map((c) => (
              <span key={c} className="badge">
                {c}
              </span>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
