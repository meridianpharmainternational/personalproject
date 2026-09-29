"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type NavCategory = { slug: string; name: string; count: number };
export type NavData = { total: number; categories: NavCategory[] };

/**
 * The category bar under the header on every public page: "All products 316",
 * then each category with its live count. On /medicines it is THE category
 * selector (aria-current marks the active one). Scrolls away with the page.
 */
export function CategoryBar({ nav }: { nav: NavData }) {
  const pathname = usePathname() ?? "";
  const params = useSearchParams();
  if (pathname.startsWith("/admin") || pathname.startsWith("/login")) return null;
  const onCatalogue = pathname === "/medicines";
  const active = onCatalogue ? params.get("category") ?? "" : null;
  return <CategoryBarView nav={nav} active={active} />;
}

/** Static render (Suspense fallback / no-JS): same links, no active state. */
export function CategoryBarView({ nav, active = null }: { nav: NavData; active?: string | null }) {
  if (!nav.categories.length) return null;
  return (
    <nav className="cat-bar" aria-label="Product categories">
      <div className="container-grid cat-bar-track">
        <Link className="cat-link" href="/medicines" aria-current={active === "" ? "page" : undefined}>
          All products {nav.total > 0 && <span className="n">{nav.total}</span>}
        </Link>
        {nav.categories.map((c) => (
          <Link
            key={c.slug}
            className="cat-link"
            href={`/medicines?category=${c.slug}`}
            aria-current={active === c.slug ? "page" : undefined}
          >
            {c.name} {c.count > 0 && <span className="n">{c.count}</span>}
          </Link>
        ))}
      </div>
    </nav>
  );
}
