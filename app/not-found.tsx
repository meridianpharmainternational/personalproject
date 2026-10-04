import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCatalogSummary } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Page not found",
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * 404 for unknown URLs and removed products (notFound() in /medicines/[id]).
 * Non-strict read: with the catalogue unavailable it still offers the
 * catalogue and contact links, just without the category list.
 */
export default async function NotFound() {
  const { total, categories } = await getCatalogSummary();

  return (
    <>
      <section className="section" aria-labelledby="nf-title">
        <div className="container-grid">
          <p className="kicker">Error 404</p>
          <h1 id="nf-title" className="mt-4 max-w-4xl">
            We couldn&rsquo;t find that page
          </h1>
          <p className="lead mt-4">
            The product may have been removed or renamed, or the link may be out of date. The full catalogue lists
            everything we currently supply.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="btn btn-primary w-full sm:w-auto" href="/medicines">
              {total > 0 ? `Browse all ${total} products` : "Browse the catalogue"}
              <ArrowRight aria-hidden strokeWidth={1.75} className="icon-trail" />
            </Link>
            <Link className="btn btn-secondary w-full sm:w-auto" href="/contact">
              Contact the export desk
            </Link>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="section surface-paper" aria-labelledby="nf-categories">
          <div className="container-grid">
            <header className="sec-head">
              <h2 id="nf-categories">Browse by category</h2>
            </header>
            <ul className="cat-cards">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/medicines?category=${encodeURIComponent(c.slug)}`} className="cat-card">
                    <span className="cat-card-name">{c.name}</span>
                    {c.count > 0 && <span className="cat-card-meta">{plural(c.count, "product", "products")}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
