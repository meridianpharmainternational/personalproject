import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import {
  getCatalogItems,
  getMedicineById,
  getRelated,
  toCatalogItem,
  type CatalogItem,
} from "@/lib/catalog";
import { site } from "@/lib/site";
import { keepTogether, moleculeLabel } from "@/lib/format";
import type { MedicineWithCategory } from "@/types/db";
import { ProductCard } from "@/components/catalog/product-card";
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
  const { sameMolecule, sameCategory } = await getRelated(m);
  const stock = item.availability === "in-stock";
  const categoryHref = m.category ? `/medicines?category=${encodeURIComponent(m.category.slug)}` : null;

  // MOQ ("On request") and availability (flagged only when made to order) are left out.
  const specs: [string, string | null][] = [
    ["Form", m.form],
    // Listed strengths are the chips in the purchase block below, so only "On request" needs a row.
    ["Strengths", item.strengths.length ? null : m.strengths?.trim() ? "On request" : null],
    ["Pack", m.pack && keepTogether(m.pack)],
    ["Lead time", m.lead_time && keepTogether(m.lead_time)],
  ];

  const paragraphs = (m.description ?? "")
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // One related row: the same molecule first, then the same category.
  const related = [...sameMolecule, ...sameCategory.filter((x) => !sameMolecule.some((y) => y.id === x.id))].slice(0, 4);

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

      <section className="container-grid py-6 lg:pb-16 lg:pt-8" aria-labelledby="pdp-title">
        <BackToResults
          productId={item.id}
          fallback={categoryHref ?? "/medicines"}
          fallbackLabel={m.category ? `All ${m.category.name}` : "Browse the catalogue"}
          className="self-start"
        />

        {/* Phones: a short, capped image well so the details start sooner.
            Tablet: image (3 of 8 columns) beside the details (5 of 8). Desktop: columns 1–5 and 7–12. */}
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
            <h1 id="pdp-title" className="break-words">
              {m.name}
            </h1>
            {m.molecule && <p className="lead mt-3">{moleculeLabel(m.molecule, item.ester)}</p>}
            {!stock && (
              <p className="mt-4">
                <span className="badge badge-mto">Made to order</span>
              </p>
            )}

            <table className="ledger mt-8">
              <caption className="sr-only">Product specification</caption>
              <tbody>
                {specs
                  .filter((row): row is [string, string] => !!row[1])
                  .map(([label, value]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td>{value}</td>
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
            <h2 id="pdp-about" className="text-h3">
              About {m.name}
            </h2>
            <div className="doc mt-4">
              {paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-line">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="section surface-paper" aria-labelledby="pdp-related">
          <div className="container-grid">
            <header className="sec-head">
              <h2 id="pdp-related" className="text-h3">
                Related products
              </h2>
            </header>
            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
              {related.map((r) => (
                <li key={r.id} className="flex">
                  <ProductCard item={r} compact />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
