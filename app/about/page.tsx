import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCatalogSummary } from "@/lib/catalog";
import { DOCS } from "@/lib/docs";
import { site } from "@/lib/site";
import { OpenEnquiryButton } from "@/components/enquiry/open-enquiry-button";

export const metadata: Metadata = {
  title: "About",
  description: `${site.fullName} supplies finished pharmaceutical formulations to licensed importers and distributors. One enquiry list, one quotation.`,
};

const STEPS = [
  {
    title: "Add products",
    body: "Add products to your enquiry list from any product card, search result or catalogue table, or paste a list you already have.",
  },
  {
    title: "Send one enquiry",
    body: "Review the list, set strengths and packs if you know them, and send every product with your details in one go.",
  },
  {
    title: "Receive your quotation",
    body: "Our export team replies by email with pricing, availability and documentation, usually within 1 business day.",
  },
];

const pad = (n: number) => String(n).padStart(2, "0");

export default async function AboutPage() {
  // Strict: a failed ISR regeneration throws, so Next keeps the last good page.
  const summary = await getCatalogSummary({ strict: true });
  const { total, categoryCount, moleculeCount, categories } = summary;
  const hasCatalog = total > 0;

  // TODO(content): add company background once confirmed by the client — years
  // in operation, export licence number and issuing authority, warehousing.
  const glance: { key: string; value: string; mono?: boolean }[] = hasCatalog
    ? [
        { key: "Products", value: String(total), mono: true },
        { key: "Active molecules", value: String(moleculeCount), mono: true },
        { key: "Categories", value: String(categoryCount), mono: true },
        ...(site.markets.confirmed ? [{ key: "Markets", value: `${site.markets.count}+`, mono: true }] : []),
        { key: "Supplied to", value: "Licensed importers and distributors" },
      ]
    : [{ key: "Supplied to", value: "Licensed importers and distributors" }];

  return (
    <>
      {/* ------------------------------------------------------ page head */}
      <header className="page-head bg-mercator">
        <div className="container-grid">
          <nav aria-label="Breadcrumb">
            <ol className="crumbs">
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <span aria-current="page">About</span>
              </li>
            </ol>
          </nav>
          <h1 className="mt-2 max-w-4xl">About {site.fullName}</h1>
          <p className="lead mt-4">
            A pharmaceutical exporter supplying finished formulations to licensed importers and
            distributors. Build one enquiry list from our catalogue and our export team replies with
            pricing, availability and documentation.
          </p>
          {hasCatalog && (
            <p className="kicker mt-6">
              {total} products · {categoryCount} categories · {moleculeCount} molecules
            </p>
          )}
        </div>
      </header>

      {/* ------------------------------------------------- 01 Who we are */}
      <section className="section" aria-labelledby="about-who">
        <div className="container-grid">
          <header className="section-head reveal">
            <p className="section-index">
              <span className="n">01</span> — Who we are
            </p>
            <div className="section-title">
              <h2 id="about-who">An export partner for licensed buyers.</h2>
            </div>
            <div className="section-aside">
              <p className="lead">
                We work through written enquiries rather than an online checkout, so each quotation is
                prepared for the products, quantities and market you ask about.
              </p>
            </div>
          </header>

          <div className="grid-12 items-start">
            <div className="measure col-span-full space-y-4 lg:col-span-6">
              <p>
                {site.fullName} supplies finished pharmaceutical formulations to importers, distributors and
                wholesalers that are licensed to buy them. We do not sell to consumers.
              </p>
              <p>
                Our catalogue is organised by category and by active ingredient, so you can compare the
                brands available for the same molecule side by side. Each product lists its form, strengths
                and pack, and our export desk confirms pricing, availability and the documents your
                destination market needs.
              </p>
              <p>
                You can build one list of every product you need and send it as a single enquiry. Pricing
                and terms are then agreed directly with our team.
              </p>
            </div>

            <div className="col-span-full lg:col-span-5 lg:col-start-8">
              <table className="ledger">
                <caption className="kicker pb-3 text-left">
                  At a glance
                </caption>
                <tbody>
                  {glance.map((r) => (
                    <tr key={r.key}>
                      <th scope="row">{r.key}</th>
                      <td className={r.mono ? "font-mono text-md font-medium" : undefined}>{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------- 02 What we supply */}
      <section className="section surface-paper" aria-labelledby="about-supply">
        <div className="container-grid">
          <header className="section-head reveal">
            <p className="section-index">
              <span className="n">02</span> — What we supply
              {hasCatalog && <span className="total">{total} in range</span>}
            </p>
            <div className="section-title">
              <h2 id="about-supply">
                {hasCatalog ? `Finished formulations across ${categoryCount} categories.` : "Finished formulations."}
              </h2>
            </div>
            <div className="section-aside">
              <p className="lead">
                Each category opens in the catalogue, where you can narrow by molecule, form, strength and
                availability.
              </p>
              <Link className="link-arrow mt-2" href="/medicines">
                {hasCatalog ? `All ${total} products` : "Browse the catalogue"}
                <ArrowRight aria-hidden className="icon-trail" />
              </Link>
            </div>
          </header>

          {categories.length > 0 ? (
            <ul className="cat-grid reveal reveal-d1">
              {categories.map((c, i) => (
                <li key={c.slug} className="contents">
                  <Link href={`/medicines?category=${encodeURIComponent(c.slug)}`} className="cat-tile">
                    <span className="cat-tile-index">
                      {pad(i + 1)}
                      <ArrowRight aria-hidden />
                    </span>
                    <span className="cat-tile-name">{c.name}</span>
                    {c.blurb && <span className="cat-tile-blurb">{c.blurb}</span>}
                    {c.topMolecules.length > 0 && (
                      <span className="cat-tile-molecules">{c.topMolecules.slice(0, 3).join(" · ")}</span>
                    )}
                    <span className="cat-tile-foot">
                      {c.count} {c.count === 1 ? "product" : "products"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="panel">
              <p>The catalogue is being updated. You can still browse it or send us an enquiry.</p>
              <Link className="link-arrow mt-2" href="/medicines">
                Open the catalogue <ArrowRight aria-hidden className="icon-trail" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------- 03 Quality & documentation */}
      <section className="section" aria-labelledby="about-quality">
        <div className="container-grid">
          <header className="section-head reveal">
            <p className="section-index">
              <span className="n">03</span> — Quality &amp; documentation
            </p>
            <div className="section-title">
              <h2 id="about-quality">Standards and documents, on request.</h2>
            </div>
            <div className="section-aside">
              <p className="lead">
                Tell us which products and destination market you need documents for, and our export desk
                will include them with your quotation.
              </p>
            </div>
          </header>

          <div className="grid-12 items-start">
            <div className="reveal col-span-full lg:col-span-7">
              <table className="ledger">
                <caption className="sr-only">Standards and documents available to buyers</caption>
                <thead>
                  <tr>
                    <th scope="col">Document</th>
                    <th scope="col" className="hidden !w-auto sm:table-cell">
                      Scope
                    </th>
                    <th scope="col" className="!w-auto">
                      Availability
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {DOCS.map((d) => (
                    <tr key={d.name}>
                      <th scope="row" className="whitespace-nowrap !text-fg-strong">
                        {d.name}
                      </th>
                      <td className="hidden !text-fg sm:table-cell">{d.scope}</td>
                      <td className="whitespace-nowrap">{d.availability}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="panel reveal reveal-d1 col-span-full lg:col-span-4 lg:col-start-9">
              <h3 className="text-h4">Documents for your market</h3>
              <p className="mt-2 text-fg-muted">
                Requirements differ from country to country. Mention your destination and any registration
                needs in your enquiry message.
              </p>
              <Link className="link-arrow mt-2" href="/contact">
                Contact the export desk <ArrowRight aria-hidden className="icon-trail" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------- 04 How enquiries work */}
      <section className="section surface-dark" aria-labelledby="about-how">
        <div className="container-grid">
          <header className="section-head reveal">
            <p className="section-index">
              <span className="n">04</span> — How enquiries work
            </p>
            <div className="section-title">
              <h2 id="about-how">One list. One enquiry. One quotation.</h2>
            </div>
            <div className="section-aside">
              <p className="lead">
                Strength and number of packs are optional. Tell us what you know and we confirm the rest.
              </p>
            </div>
          </header>

          <ol className="steps reveal reveal-d1">
            {STEPS.map((s, i) => (
              <li key={s.title} className="step">
                <p className="step-n">{pad(i + 1)}</p>
                <h3 className="mt-4">{s.title}</h3>
                <p className="mt-2">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------- 05 Next step */}
      <section className="section surface-paper bg-mercator" aria-labelledby="about-cta">
        <div className="container-grid">
          <div className="panel reveal grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-x-6 lg:p-10">
            <div className="lg:col-span-7">
              <p className="section-index">
                <span className="n">05</span> — Next step
              </p>
              <h2 id="about-cta" className="mt-4">
                Ready to send your list?
              </h2>
              <p className="lead mt-4">
                Add what you need from the catalogue, then review and send it as one enquiry.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
              <OpenEnquiryButton className="btn btn-enquire w-full sm:w-auto" />
              <Link href="/medicines" className="btn btn-secondary w-full sm:w-auto">
                {hasCatalog ? `Browse all ${total} products` : "Browse the catalogue"}
              </Link>
              <Link href="/contact" className="btn btn-ghost w-full sm:w-auto">
                Or write to us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
