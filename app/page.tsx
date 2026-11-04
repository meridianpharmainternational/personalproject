import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Phone, Truck } from "lucide-react";
import { HeroChart } from "@/components/hero-chart";
import { ProductCard } from "@/components/catalog/product-card";
import { getCatalogItems, getCatalogSummary, varied } from "@/lib/catalog";
import { contact, site, whatsappLink } from "@/lib/site";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Products shown under "Featured products": one per molecule, mixed across categories. */
const FEATURED_N = 4;

const STEPS = [
  {
    title: "Add products",
    body: "Tap “Add” on any product, or paste a list. It stays on this device while you browse.",
  },
  { title: "Send one enquiry", body: "Review the list, add your details once and send everything together." },
  { title: "Get your quotation", body: "Our export team replies with pricing, availability and documents." },
];

/* ----------------------------------------------------------------- metadata */

// Strict reads: if the catalogue can't be loaded during an ISR regeneration,
// the render throws and Next keeps serving the last good page.
export async function generateMetadata(): Promise<Metadata> {
  const s = await getCatalogSummary({ strict: true });
  const description =
    s.total > 0
      ? `${site.fullName} exports ${s.total} pharmaceutical products across ${s.categoryCount} categories. Build one enquiry list and receive pricing, availability and documentation in a single reply.`
      : site.description;
  return { description, openGraph: { description } };
}

/* --------------------------------------------------------------------- page */

export default async function HomePage() {
  const [summary, items] = await Promise.all([getCatalogSummary({ strict: true }), getCatalogItems({ strict: true })]);
  const { total, categoryCount, categories } = summary;
  const hasCatalog = total > 0;

  // One product per category first, so the four featured products are varied.
  const firstPerCategory = categories
    .map((c) => items.find((it) => it.category?.slug === c.slug))
    .filter((it): it is NonNullable<typeof it> => !!it);
  const featured = varied([...firstPerCategory, ...items], FEATURED_N);

  // Quick ways to reach the desk, under the hero buttons.
  const wa = whatsappLink();
  const telegram = site.social.find((s) => s.name === "Telegram");
  const reach: { label: string; href: string; external?: boolean }[] = [];
  if (contact.phone && contact.phoneHref) reach.push({ label: contact.phone, href: contact.phoneHref });
  if (wa) reach.push({ label: "WhatsApp", href: wa, external: true });
  if (telegram) reach.push({ label: "Telegram", href: telegram.href, external: true });

  return (
    <>
      {/* ------------------------------------------------------------ HERO */}
      <section className="hero" aria-labelledby="home-title">
        <HeroChart />
        <div className="container-grid">
          <div className="hero-copy max-w-2xl">
            {/* Each certification stays whole, so a narrow screen breaks between them. */}
            <p className="kicker">
              {site.certifications.map((c, i) => (
                <Fragment key={c}>
                  {i > 0 && " · "}
                  <span className="whitespace-nowrap">{c}</span>
                </Fragment>
              ))}
            </p>
            <h1 id="home-title" className="text-display mt-5">
              Global access to <span className="text-leaf-300">better health</span>.
            </h1>
            <p className="lead mt-6">
              Licensed exporter of finished pharmaceutical formulations to importers and distributors worldwide.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className="btn btn-inverse btn-lg" href="/medicines">
                Browse products
                <ArrowRight aria-hidden strokeWidth={1.75} className="icon-trail" />
              </Link>
              <Link className="btn btn-enquire btn-lg" href="/contact">
                Get a quote
              </Link>
            </div>
            <ul className="hero-notes mt-8">
              <li className="text-flow">
                <Truck aria-hidden strokeWidth={1.75} />
                <span>
                  <b>{site.shipping.us}</b>, plus {site.exportReach.short}.
                </span>
              </li>
              {reach.length > 0 && (
                <li className="text-flow">
                  <Phone aria-hidden strokeWidth={1.75} />
                  <span>
                    {reach.map((r, i) => (
                      <Fragment key={r.label}>
                        {i > 0 && " · "}
                        <a href={r.href} {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                          {r.label}
                        </a>
                      </Fragment>
                    ))}
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- CATEGORIES */}
      {categories.length > 0 && (
        <section className="section" aria-labelledby="home-categories">
          <div className="container-grid">
            <header className="sec-head">
              <div>
                <h2 id="home-categories">Browse by category</h2>
                {hasCatalog && (
                  <p className="lead">
                    {plural(total, "product", "products")} across {plural(categoryCount, "category", "categories")}.
                  </p>
                )}
              </div>
              <Link className="link-arrow" href="/medicines">
                View all products
                <ArrowRight aria-hidden strokeWidth={1.75} />
              </Link>
            </header>
            <ul className="cat-cards">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/medicines?category=${encodeURIComponent(c.slug)}`} className="cat-card">
                    <span className="cat-card-name">{c.name}</span>
                    <span className="cat-card-meta">{plural(c.count, "product", "products")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* --------------------------------------------------------- FEATURED */}
      {featured.length > 0 && (
        <section className="section surface-paper" aria-labelledby="home-featured">
          <div className="container-grid">
            <header className="sec-head">
              <h2 id="home-featured">Featured products</h2>
            </header>
            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
              {featured.map((it) => (
                <li key={it.id} className="flex">
                  <ProductCard item={it} compact />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ HOW IT WORKS */}
      <section className="section" aria-labelledby="home-how">
        <div className="container-grid">
          <header className="sec-head">
            <h2 id="home-how">How enquiries work</h2>
          </header>
          <ol className="how">
            {STEPS.map((s, i) => (
              <li key={s.title} className="how-step">
                <span className="how-n" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="how-title">{s.title}</h3>
                <p className="how-body">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
