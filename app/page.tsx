import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Truck } from "lucide-react";
import { HeroChart } from "@/components/hero-chart";
import { BrandMark } from "@/components/social-icon";
import { ProductCard } from "@/components/catalog/product-card";
import { ReviewCarousel } from "@/components/reviews/review-carousel";
import { getCatalogItems, getCatalogSummary, varied } from "@/lib/catalog";
import { getApprovedReviews } from "@/lib/reviews";
import { ogBase } from "@/lib/seo";
import { contact, site, whatsappLink } from "@/lib/site";

/** Newest published reviews in the home carousel; the rest are on /reviews. */
const REVIEWS_SHOWN = 9;

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

const description = `Pharmaceutical exporter to licensed importers and distributors in 50+ countries: ${site.catalogueSize} products, ED medicines to aesthetics. One enquiry, one quotation.`;
export const metadata: Metadata = {
  // Absolute: the home page carries the full name itself instead of the "%s · name" template.
  title: { absolute: `${site.fullName} — Pharmaceutical Exporter & Supplier` },
  description,
  alternates: { canonical: "/" },
  openGraph: { ...ogBase, url: "/" },
};

/* --------------------------------------------------------------------- page */

// Strict reads: if the catalogue can't be loaded during an ISR regeneration,
// the render throws and Next keeps serving the last good page.
export default async function HomePage() {
  const [summary, items, reviews] = await Promise.all([
    getCatalogSummary({ strict: true }),
    getCatalogItems({ strict: true }),
    getApprovedReviews(),
  ]);
  const { categories } = summary;

  // One product per category first, so the four featured products are varied.
  const firstPerCategory = categories
    .map((c) => items.find((it) => it.category?.slug === c.slug))
    .filter((it): it is NonNullable<typeof it> => !!it);
  const featured = varied([...firstPerCategory, ...items], FEATURED_N);

  // Quick ways to reach the desk, under the hero buttons: the number, then the WhatsApp and
  // Telegram marks (icon only; the name stays for screen readers).
  const wa = whatsappLink();
  const telegram = site.social.find((s) => s.name === "Telegram");
  const reach: { kind: "Phone" | "WhatsApp" | "Telegram"; label: string; href: string; external?: boolean }[] = [];
  if (contact.phone && contact.phoneHref) reach.push({ kind: "Phone", label: contact.phone, href: contact.phoneHref });
  if (contact.phone2 && contact.phone2Href)
    reach.push({ kind: "Phone", label: contact.phone2, href: contact.phone2Href });
  if (wa) reach.push({ kind: "WhatsApp", label: "WhatsApp", href: wa, external: true });
  if (telegram) reach.push({ kind: "Telegram", label: "Telegram", href: telegram.href, external: true });

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
              Licensed exporter of finished pharmaceutical formulations, with {site.catalogueSize} products available to
              importers and distributors worldwide.
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
                <li className="hero-reach">
                  {reach.map((r) => (
                    <a
                      key={r.href}
                      className="hero-reach-link"
                      href={r.href}
                      {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      <BrandMark name={r.kind} />
                      <span className={r.kind === "Phone" ? undefined : "sr-only"}>{r.label}</span>
                    </a>
                  ))}
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
                <p className="lead">Our most requested ranges; {site.catalogueSize} products are available to order.</p>
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
                    {c.blurb && <span className="cat-card-meta">{c.blurb}</span>}
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

      {/* ---------------------------------------------------------- REVIEWS */}
      {/* Only once a review is published: an empty "reviews" block would only undersell the company. */}
      {reviews.length > 0 && (
        <section className="section surface-paper" aria-labelledby="home-reviews">
          <div className="container-grid">
            <header className="sec-head">
              <div>
                <h2 id="home-reviews">What our buyers say</h2>
                <p className="lead">Reviews from importers and distributors, checked by our team before they appear.</p>
              </div>
              <Link className="link-arrow" href="/reviews#write">
                Write a review
                <ArrowRight aria-hidden strokeWidth={1.75} />
              </Link>
            </header>
            <ReviewCarousel reviews={reviews.slice(0, REVIEWS_SHOWN)} label="Customer reviews" />
          </div>
        </section>
      )}
    </>
  );
}
