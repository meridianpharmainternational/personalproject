import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ShieldAlert } from "lucide-react";
import {
  getCatalogItems,
  getCatalogSummary,
  getMedicineById,
  getRelated,
  toCatalogItem,
  type CatalogItem,
} from "@/lib/catalog";
import { site } from "@/lib/site";
import { keepTogether, moleculeLabel } from "@/lib/format";
import type { MedicineWithCategory } from "@/types/db";
import { ProductCard } from "@/components/catalog/product-card";
import { ProductRow } from "@/components/catalog/product-row";
import { ProductPurchase } from "@/components/catalog/product-purchase";
import { BackToResults } from "@/components/catalog/back-to-results";

type Props = { params: Promise<{ id: string }> };

/** One lookup per request, shared by generateMetadata and the page. */
const getProduct = cache((id: string) => getMedicineById(id));

function describe(m: MedicineWithCategory, strengths: string[]): string {
  const what = [m.molecule, m.form, m.category?.name].filter(Boolean).join(" · ");
  return [
    `${m.name}${what ? ` — ${what}.` : "."}`,
    strengths.length ? `Strengths: ${strengths.join(", ")}.` : null,
    `Add it to your enquiry list for pricing, availability and documents from ${site.fullName}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/**
 * The product's <title>: its name, plus its form only when another active
 * product shares the name, plus its first strength only when name and form
 * still collide ("IVERHEAL Tablets" / "IVERHEAL Cream", "BOLDENAN Injection
 * 250 mg/ml" / "BOLDENAN Injection 400 mg/ml"), so every product URL has its
 * own title.
 */
async function productTitle(item: CatalogItem): Promise<string> {
  const twins = (await getCatalogItems()).filter((x) => x.id !== item.id && norm(x.name) === norm(item.name));
  if (!twins.length) return item.name;
  const parts = [item.name];
  if (item.form && !norm(item.name).includes(norm(item.form))) parts.push(item.form);
  if (item.strengths[0] && twins.some((x) => norm(x.form) === norm(item.form))) parts.push(item.strengths[0]);
  return parts.join(" ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const m = await getProduct(id);
  if (!m) return { title: "Product not found" };
  const item = toCatalogItem(m);
  const description = describe(m, item.strengths);
  const title = await productTitle(item);
  // Same path as app/sitemap.ts, so ?utm_… / ?ref= share links fold into one URL.
  const path = `/medicines/${encodeURIComponent(m.id)}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: "website",
      ...(item.image ? { images: [{ url: item.image, alt: `${m.name} pack` }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const m = await getProduct(id);
  if (!m) notFound();

  const item = toCatalogItem(m);
  const [{ sameMolecule, sameCategory }, summary] = await Promise.all([getRelated(m), getCatalogSummary()]);
  const stock = item.availability === "in-stock";
  const availability = stock ? "In stock" : "Made to order";

  const categoryHref = m.category ? `/medicines?category=${encodeURIComponent(m.category.slug)}` : null;

  const specs: [string, string | null][] = [
    ["Form", m.form],
    ["Strengths", item.strengths.length ? item.strengths.map(keepTogether).join(", ") : null],
    ["Pack", m.pack && keepTogether(m.pack)],
    ["MOQ", m.moq && keepTogether(m.moq)],
    ["Lead time", m.lead_time && keepTogether(m.lead_time)],
    ["Availability", availability],
  ];

  const paragraphs = (m.description ?? "")
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const moleculeTotal = m.molecule ? summary.molecules.find((x) => x.name === m.molecule)?.count : undefined;
  const categoryTotal = m.category ? summary.categories.find((c) => c.slug === m.category?.slug)?.count : undefined;

  // Section index numbers run 01, 02, … over the sections actually rendered.
  let n = 0;
  const nextIndex = () => String(++n).padStart(2, "0");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: m.name,
    // A description that is only the ester word is already in the lead ("Testosterone Cypionate").
    description: (item.ester ? "" : paragraphs.join(" ")) || describe(m, item.strengths),
    ...(item.image ? { image: item.image } : {}),
    ...(m.category ? { category: m.category.name } : {}),
    additionalProperty: [
      m.molecule && { "@type": "PropertyValue", name: "Active ingredient", value: m.molecule },
      m.form && { "@type": "PropertyValue", name: "Dosage form", value: m.form },
      item.strengths.length && { "@type": "PropertyValue", name: "Strengths", value: item.strengths.join(", ") },
    ].filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <section className="container-grid py-8 lg:pb-16" aria-labelledby="pdp-title">
        {/* Phones: "Back to results" on its own row above the crumbs.
            Tablet and up: beside them, split by a hairline; long crumbs wrap
            in their own column so the link keeps its place. */}
        <div className="flex flex-col md:flex-row md:items-start md:gap-4">
          <BackToResults
            productId={item.id}
            fallback={categoryHref ?? "/medicines"}
            fallbackLabel={m.category ? `All ${m.category.name}` : "Browse the catalogue"}
            className="self-start md:-mr-2.5 md:flex-none"
          />
          <span aria-hidden="true" className="mt-3 hidden h-5 w-px flex-none bg-rule md:block" />
          <nav aria-label="Breadcrumb" className="min-w-0 md:flex-1">
            <ol className="crumbs">
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/medicines">Catalogue</Link>
              </li>
              {m.category && categoryHref && (
                <li>
                  <Link href={categoryHref}>{m.category.name}</Link>
                </li>
              )}
              <li>
                <span aria-current="page">{m.name}</span>
              </li>
            </ol>
          </nav>
        </div>

        {/* Phones: a short, capped image well so the details start sooner.
            Tablet: image (3 of 8 columns) beside the details (5 of 8).
            Desktop: columns 1–5 and 7–12 per the spec. */}
        <div className="grid-12 mt-4 md:items-start lg:mt-6">
          <div className="pdp-media col-span-full max-md:aspect-[16/10] max-md:max-h-[40svh] md:sticky md:top-[calc(var(--header-h)+1.5rem)] md:col-span-3 lg:col-span-5">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image} alt={`${m.name} pack`} width={800} height={800} decoding="async" fetchPriority="high" />
            ) : (
              <div className="absolute inset-0 flex flex-col justify-end gap-2 p-6 lg:p-8" aria-hidden="true">
                <span className="kicker">{m.form ?? "Product"}</span>
                <span className="break-words font-serif text-h2 font-semibold text-navy-900 md:max-lg:text-h3">
                  {m.name}
                </span>
              </div>
            )}
          </div>

          <div className="col-span-full min-w-0 md:col-span-5 lg:col-span-6 lg:col-start-7">
            {m.category && <p className="kicker">{m.category.name}</p>}
            <h1 id="pdp-title" className="mt-3 break-words">
              {m.name}
            </h1>
            {m.molecule && <p className="lead mt-3">{moleculeLabel(m.molecule, item.ester)}</p>}
            <p className="mt-5">
              <span className={`badge ${stock ? "badge-stock" : "badge-mto"}`}>{availability}</span>
            </p>

            <table className="ledger mt-8">
              <caption className="sr-only">Product specification</caption>
              <tbody>
                {specs
                  .filter((row): row is [string, string] => !!row[1])
                  .map(([label, value]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td className="font-mono">{value}</td>
                    </tr>
                  ))}
              </tbody>
            </table>

            <ProductPurchase key={item.id} product={item} />

            {m.note && (
              <div className="panel mt-8 flex gap-4 bg-paper">
                <ShieldAlert aria-hidden size={20} strokeWidth={1.75} className="mt-0.5 flex-none text-navy-700" />
                <div className="min-w-0">
                  <h2 className="font-sans text-h4 tracking-normal">Regulatory note</h2>
                  <p className="mt-1">{m.note}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {paragraphs.length > 0 && !item.ester && (
        <section className="section pt-4 lg:pt-8" aria-labelledby="pdp-about">
          <div className="container-grid">
            <header className="section-head reveal">
              <p className="section-index">
                <span className="n">{nextIndex()}</span> — Description
              </p>
              <div className="section-title">
                <h2 id="pdp-about">About {m.name}</h2>
              </div>
            </header>
            <div className="doc">
              {paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-line">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {(sameMolecule.length > 0 || sameCategory.length > 0) && (
        <section className="section surface-paper" aria-label="Related products">
          <div className="container-grid">
            {sameMolecule.length > 0 && m.molecule && (
              <RelatedBlock
                id="pdp-rel-molecule"
                index={nextIndex()}
                indexLabel="Same molecule"
                title={`Other products with ${m.molecule}`}
                href={`/medicines?molecule=${encodeURIComponent(m.molecule)}`}
                linkLabel={moleculeTotal ? `All ${moleculeTotal} ${m.molecule} products` : `All ${m.molecule} products`}
                items={sameMolecule}
              />
            )}
            {sameCategory.length > 0 && m.category && (
              <RelatedBlock
                id="pdp-rel-category"
                index={nextIndex()}
                indexLabel="Same category"
                title={`More in ${m.category.name}`}
                href={`/medicines?category=${encodeURIComponent(m.category.slug)}`}
                linkLabel={categoryTotal ? `All ${categoryTotal} in ${m.category.name}` : `All of ${m.category.name}`}
                items={sameCategory}
                className={sameMolecule.length > 0 ? "mt-16 lg:mt-24" : undefined}
              />
            )}
          </div>
        </section>
      )}
    </>
  );
}

function RelatedBlock({
  id,
  index,
  indexLabel,
  title,
  href,
  linkLabel,
  items,
  className,
}: {
  id: string;
  index: string;
  indexLabel: string;
  title: string;
  href: string;
  linkLabel: string;
  items: CatalogItem[];
  className?: string;
}) {
  return (
    <div className={className} role="group" aria-labelledby={id}>
      <header className="section-head reveal">
        <p className="section-index">
          <span className="n">{index}</span> — {indexLabel}
        </p>
        <div className="section-title">
          <h2 id={id}>{title}</h2>
        </div>
        <div className="section-aside">
          <Link className="link-arrow" href={href}>
            {linkLabel}
            <ArrowRight aria-hidden strokeWidth={1.75} className="icon-trail" />
          </Link>
        </div>
      </header>

      {/* Phones: dense rows. Tablet and up: product cards. */}
      <ul className="border-t border-rule md:hidden">
        {items.map((it) => (
          <ProductRow key={it.id} item={it} />
        ))}
      </ul>
      <div className="results-grid no-filters hidden md:grid">
        {items.map((it) => (
          <ProductCard key={it.id} item={it} />
        ))}
      </div>
    </div>
  );
}
