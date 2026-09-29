import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  FileCheck2,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { HeroChart } from "@/components/hero-chart";
import { OpenEnquiryButton } from "@/components/enquiry/open-enquiry-button";
import { HeroSearch } from "@/components/home/hero-search";
import { ProductRail, type RailTab } from "@/components/home/product-rail";
import {
  getCatalogItems,
  getCatalogSummary,
  varied,
  type CatalogItem,
  type CatalogSummary,
  type MoleculeCount,
} from "@/lib/catalog";
import { DOCS } from "@/lib/docs";
import { contact, site, whatsappLink } from "@/lib/site";

/* ------------------------------------------------------------------ helpers */

type Icon = typeof ShieldCheck;

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const pad = (n: number) => String(n).padStart(2, "0");

const RAIL_N = 8;

/** Server-picked rail sets: "All" interleaves the categories; each tab sends at most 8 items. */
function buildRail(items: CatalogItem[], summary: CatalogSummary): RailTab[] {
  const byCat = new Map<string, CatalogItem[]>();
  for (const it of items) {
    const slug = it.category?.slug;
    if (!slug) continue;
    const list = byCat.get(slug);
    if (list) list.push(it);
    else byCat.set(slug, [it]);
  }

  const catTabs: RailTab[] = summary.categories.map((c) => ({
    key: c.slug,
    label: c.name,
    count: c.count,
    href: `/medicines?category=${encodeURIComponent(c.slug)}`,
    viewAllLabel: `View all ${c.count} ${c.name}`,
    items: varied(byCat.get(c.slug) ?? [], RAIL_N),
  }));

  const interleaved: CatalogItem[] = [];
  for (let i = 0; i < RAIL_N; i++) {
    for (const t of catTabs) if (t.items[i]) interleaved.push(t.items[i]);
  }

  return [
    {
      key: "__all",
      label: "All",
      srSuffix: " products",
      count: summary.total,
      href: "/medicines",
      viewAllLabel: `View all ${summary.total} products`,
      items: varied([...interleaved, ...items], RAIL_N),
    },
    ...catTabs,
  ];
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Molecules grouped by first letter (A–Z, then "#" for anything else). */
function azGroups(molecules: MoleculeCount[]) {
  const map = new Map<string, MoleculeCount[]>();
  for (const m of molecules) {
    const ch = m.name.trim().normalize("NFD").charAt(0).toUpperCase();
    const key = /^[A-Z]$/.test(ch) ? ch : "#";
    const list = map.get(key);
    if (list) list.push(m);
    else map.set(key, [m]);
  }
  const keys = [...LETTERS.filter((l) => map.has(l)), ...(map.has("#") ? ["#"] : [])];
  return keys.map((k) => ({ key: k, id: k === "#" ? "az-other" : `az-${k}`, list: map.get(k)! }));
}

function certIcon(name: string): Icon {
  if (/gmp/i.test(name)) return ShieldCheck;
  if (/iso/i.test(name)) return BadgeCheck;
  if (/gdp|distribution/i.test(name)) return Truck;
  return Award;
}

const STEPS = [
  { title: "Add products", body: "From any card, search result or table row. Your list stays on this device while you browse." },
  { title: "Send one enquiry", body: "Strength and packs are optional. Add your details once for the whole list." },
  { title: "Receive your quotation", body: "Pricing, availability and documentation in one reply." },
];

/* ----------------------------------------------------------------- metadata */

// Strict reads: if the catalogue can't be loaded during an ISR regeneration,
// the render throws and Next keeps serving the last good page.
export async function generateMetadata(): Promise<Metadata> {
  const s = await getCatalogSummary({ strict: true });
  const description =
    s.total > 0
      ? `${site.fullName} exports ${s.total} pharmaceutical products across ${s.categoryCount} categories and ${s.moleculeCount} molecules. Build one enquiry list and receive pricing, availability and documentation in a single reply.`
      : site.description;
  return { description, openGraph: { description } };
}

/* --------------------------------------------------------------------- page */

export default async function HomePage() {
  const [summary, items] = await Promise.all([
    getCatalogSummary({ strict: true }),
    getCatalogItems({ strict: true }),
  ]);
  const { total, categoryCount, moleculeCount, categories, molecules, popularMolecules } = summary;

  const hasCatalog = total > 0;
  const hasCats = categories.length > 0;
  const hasMolecules = molecules.length > 0;
  const railTabs = hasCatalog ? buildRail(items, summary) : [];
  const hasRail = railTabs.length > 0 && railTabs[0].items.length > 0;
  const groups = azGroups(molecules);
  const groupIds = new Map(groups.map((g) => [g.key, g.id]));

  // Section index numbers run 01, 02, … over the sections actually shown.
  let n = 0;
  const next = () => pad(++n);
  const idxCats = hasCats ? next() : "";
  const idxRange = hasRail ? next() : "";
  const idxAz = hasMolecules ? next() : "";
  const idxHow = next();
  const idxQuality = next();
  const idxCta = next();

  const trust: { label: string; Icon: Icon }[] = [
    ...site.certifications.map((c) => ({ label: c, Icon: certIcon(c) })),
    { label: "COA & COPP on request", Icon: FileCheck2 },
  ];

  const wa = whatsappLink();
  const contactRows: { key: string; href: string; label: string; sr: string; Icon: Icon; external?: boolean }[] = [];
  if (contact.email) contactRows.push({ key: "email", href: `mailto:${contact.email}`, label: contact.email, sr: "Email: ", Icon: Mail });
  if (contact.phoneHref && contact.phone) contactRows.push({ key: "phone", href: contact.phoneHref, label: contact.phone, sr: "Phone: ", Icon: Phone });
  if (wa) contactRows.push({ key: "whatsapp", href: wa, label: "WhatsApp", sr: "Message us on ", Icon: MessageCircle, external: true });

  return (
    <>
      {/* ------------------------------------------------------------ HERO */}
      <section className="hero bg-columns" aria-labelledby="home-title">
        <HeroChart />
        <div className="container-grid grid-12 items-center">
          <div className="col-span-full lg:col-span-7">
            <p className="kicker">
              <span aria-hidden="true">000° — </span>Pharmaceutical exports
            </p>
            <h1 id="home-title" className="text-display mt-5">
              Global access to better health.
            </h1>
            <p className="lead mt-6">
              {hasCatalog ? (
                <>
                  {plural(total, "product", "products")} across {plural(categoryCount, "category", "categories")} and{" "}
                  {plural(moleculeCount, "molecule", "molecules")}, supplied worldwide. Build one enquiry list and our
                  export team replies with pricing, availability and documents.
                </>
              ) : (
                <>
                  Pharmaceutical products supplied worldwide. Build one enquiry list and our export team replies with
                  pricing, availability and documents.
                </>
              )}
            </p>

            <HeroSearch categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />

            {popularMolecules.length > 0 && (
              <p className="hero-popular">
                <span>Popular:</span>
                {popularMolecules.map((m) => (
                  <Link key={m.name} href={`/medicines?molecule=${encodeURIComponent(m.name)}`}>
                    {m.name}
                  </Link>
                ))}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="btn btn-inverse btn-lg w-full sm:w-auto" href="/medicines">
                {hasCatalog ? `Browse all ${total} products` : "Browse the catalogue"}
                <ArrowRight aria-hidden strokeWidth={1.75} className="icon-trail" />
              </Link>
              <a className="btn btn-outline-inverse btn-lg w-full sm:w-auto" href="#how">
                How enquiries work
              </a>
            </div>
          </div>

          {hasCatalog && (
            <dl
              className="spec-panel corner-ticks col-span-full mt-4 lg:col-span-4 lg:col-start-9 lg:mt-0"
              aria-label="Catalogue at a glance"
            >
              <div className="spec-row">
                <dt className="spec-key">Products</dt>
                <dd className="spec-val">{total}</dd>
              </div>
              <div className="spec-row">
                <dt className="spec-key">Molecules</dt>
                <dd className="spec-val">{moleculeCount}</dd>
              </div>
              <div className="spec-row">
                <dt className="spec-key">Categories</dt>
                <dd className="spec-val">{categoryCount}</dd>
              </div>
              {site.markets.confirmed && (
                <div className="spec-row">
                  <dt className="spec-key">Markets</dt>
                  <dd className="spec-val">{site.markets.count}+</dd>
                </div>
              )}
            </dl>
          )}
        </div>
        <div className="scale-rule absolute inset-x-0 bottom-0" aria-hidden="true" />
      </section>

      {/* ----------------------------------------------------- TRUST STRIP */}
      <div className="container-grid">
        <ul
          className="trust-strip"
          aria-label="Certifications and documents"
          style={{ "--trust-n": trust.length } as CSSProperties}
        >
          {trust.map(({ label, Icon }) => (
            <li key={label} className="trust-item">
              <Icon aria-hidden strokeWidth={1.75} />
              {label}
            </li>
          ))}
        </ul>
      </div>

      {/* ------------------------------------------------- 01 CATEGORIES */}
      {hasCats && (
        <section className="section" aria-labelledby="home-categories">
          <div className="container-grid">
            <header className="section-head reveal">
              <p className="section-index">
                <span className="n">{idxCats}</span> — Categories{" "}
                <span className="total">{plural(total, "product", "products")}</span>
              </p>
              <div className="section-title">
                <h2 id="home-categories">
                  {numberWord(categoryCount)} {categoryCount === 1 ? "category" : "categories"}. One catalogue.
                </h2>
              </div>
              <div className="section-aside">
                <p className="lead">
                  Start from a therapeutic area. Each tile{" "}
                  <span className="hidden lg:inline">lists its leading molecules and </span>
                  <span className="lg:hidden">shows </span>
                  how many products it holds.
                </p>
                <Link className="link-arrow mt-3" href="/medicines">
                  All {plural(total, "product", "products")}
                  <ArrowRight aria-hidden strokeWidth={1.75} />
                </Link>
              </div>
            </header>

            <ul className="cat-grid reveal reveal-d1">
              {categories.map((c, i) => (
                <li key={c.slug} className="flex">
                  <Link href={`/medicines?category=${encodeURIComponent(c.slug)}`} className="cat-tile flex-1">
                    <span className="cat-tile-index" aria-hidden="true">
                      {pad(i + 1)}
                      <ArrowRight strokeWidth={1.75} />
                    </span>
                    <span className="cat-tile-name">{c.name}</span>
                    {c.blurb && <span className="cat-tile-blurb">{c.blurb}</span>}
                    {c.topMolecules.length > 0 && (
                      <span className="cat-tile-molecules">{c.topMolecules.slice(0, 3).join(" · ")}</span>
                    )}
                    <span className="cat-tile-foot">{plural(c.count, "product", "products")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- 02 PRODUCTS */}
      {hasRail && (
        <section className="section surface-paper" aria-labelledby="home-range">
          <div className="container-grid">
            <header className="section-head reveal">
              <p className="section-index">
                <span className="n">{idxRange}</span> — Products <span className="total">{total} in range</span>
              </p>
              <div className="section-title">
                <h2 id="home-range">Browse the range</h2>
              </div>
              <div className="section-aside">
                <p className="lead">Add any product to your enquiry list and send them all at once.</p>
              </div>
            </header>
            <ProductRail tabs={railTabs} />
          </div>
        </section>
      )}

      {/* ----------------------------------------------- 03 MOLECULES A–Z */}
      {hasMolecules && (
        <section className="section bg-columns" aria-labelledby="home-molecules">
          <div className="container-grid">
            <header className="section-head reveal">
              <p className="section-index">
                <span className="n">{idxAz}</span> — Molecules A–Z{" "}
                <span className="total">{plural(moleculeCount, "molecule", "molecules")}</span>
              </p>
              <div className="section-title">
                <h2 id="home-molecules">Find by active ingredient</h2>
              </div>
              <div className="section-aside">
                <p className="lead">
                  Every brand is listed under its molecule, so you can compare the options for one active ingredient.
                </p>
              </div>
            </header>

            <nav className="az-jump" aria-label="Molecules by first letter">
              {LETTERS.map((l) => {
                const id = groupIds.get(l);
                return id ? (
                  <a key={l} href={`#${id}`}>
                    {l}
                  </a>
                ) : (
                  <span key={l} role="link" aria-disabled="true">
                    {l}
                  </span>
                );
              })}
              {groupIds.has("#") && (
                <a href="#az-other">#</a>
              )}
            </nav>

            <div className="az-index">
              {groups.map((g) => (
                <div key={g.key} id={g.id} className="az-group">
                  <h3 className="az-letter text-lg">{g.key}</h3>
                  <ul>
                    {g.list.map((m) => (
                      <li key={m.name}>
                        <Link className="az-link" href={`/medicines?molecule=${encodeURIComponent(m.name)}`}>
                          <span className="min-w-0">{m.name}</span>
                          <span className="count">
                            <span className="sr-only">, </span>
                            {m.count}
                            <span className="sr-only"> {m.count === 1 ? "product" : "products"}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------- 04 HOW ENQUIRY WORKS */}
      <section id="how" className="section surface-dark" aria-labelledby="home-how">
        <div className="container-grid">
          <header className="section-head reveal">
            <p className="section-index">
              <span className="n">{idxHow}</span> — How enquiry works
            </p>
            <div className="section-title">
              <h2 id="home-how">One list. One enquiry. One quotation.</h2>
            </div>
            <div className="section-aside">
              <p className="lead">
                Build the list as you browse and send it when you are ready. The export team answers the whole list in
                one reply.
              </p>
            </div>
          </header>

          <ol className="steps reveal reveal-d1">
            {STEPS.map((s, i) => (
              <li key={s.title} className="step">
                <p className="step-n">{pad(i + 1)}</p>
                <h3 className="mt-4">{s.title}</h3>
                <p className="mt-2 max-w-measure">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap gap-3 reveal reveal-d2">
            <OpenEnquiryButton className="btn btn-enquire btn-lg w-full sm:w-auto" />
            <Link className="btn btn-outline-inverse btn-lg w-full sm:w-auto" href="/contact">
              Talk to the exports team
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------------------- 05 QUALITY & DOCUMENTATION */}
      <section className="section" aria-labelledby="home-quality">
        <div className="container-grid grid-12 gap-y-10">
          <div className="col-span-full lg:col-span-5 reveal">
            <p className="section-index">
              <span className="n">{idxQuality}</span> — Quality
            </p>
            <h2 id="home-quality" className="mt-6">
              Quality &amp; documentation
            </h2>
            <p className="mt-4 max-w-measure">
              Import and registration files need the right paperwork. Tell us what your market requires and the export
              team confirms, product by product, which certificates and documents come with your quotation.
            </p>
            <Link className="link-arrow mt-4" href="/contact">
              Ask about a document
              <ArrowRight aria-hidden strokeWidth={1.75} />
            </Link>
          </div>

          <div className="col-span-full overflow-x-auto lg:col-span-6 lg:col-start-7 reveal reveal-d1">
            <table className="ledger">
              <caption className="sr-only">Certifications and documents</caption>
              <thead>
                <tr>
                  {/* Document keeps the ledger's 36% th width; the other two must opt out of it
                      (.ledger th outranks a plain w-* utility), or three 36% columns overflow. */}
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
        </div>
      </section>

      {/* ---------------------------------------------------------- 06 CTA */}
      <section className="section surface-paper bg-mercator" aria-label="Start your enquiry">
        <div className="container-grid">
          <p className="section-index mb-10 reveal lg:mb-14">
            <span className="n">{idxCta}</span> — Next step
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="panel corner-ticks flex flex-col gap-4 lg:p-8 reveal">
              <h2 className="font-sans text-h3">Have a product list already?</h2>
              <p className="max-w-measure">
                Paste it and we&rsquo;ll match it to the catalogue. Anything we don&rsquo;t list goes in as a custom
                request.
              </p>
              <div className="mt-auto pt-2">
                <OpenEnquiryButton
                  className="btn btn-enquire btn-lg w-full sm:w-auto"
                  label="Paste a list"
                  showCount={false}
                  paste
                />
              </div>
            </div>

            <div className="panel flex flex-col gap-4 lg:p-8 reveal reveal-d1">
              <h2 className="font-sans text-h3">Talk to the export desk</h2>
              <p className="max-w-measure">
                Questions about registration, packaging or lead times? Send them with your list, or contact the export
                team directly.
              </p>
              {contactRows.length > 0 && (
                <ul className="border-t border-rule">
                  {contactRows.map(({ key, href, label, sr, Icon, external }) => (
                    <li key={key} className="border-b border-rule">
                      <a
                        href={href}
                        className="flex min-h-tap items-center gap-3 py-2 font-medium text-navy-900 underline decoration-transparent underline-offset-4 hover:decoration-current"
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      >
                        <Icon aria-hidden strokeWidth={1.75} className="h-5 w-5 flex-none text-navy-700" />
                        <span className="min-w-0 break-words">
                          <span className="sr-only">{sr}</span>
                          {label}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto pt-2">
                <Link className="btn btn-secondary btn-lg w-full sm:w-auto" href="/contact">
                  {contactRows.length > 0 ? "Use the contact form" : "Contact the export desk"}
                  <ArrowRight aria-hidden strokeWidth={1.75} className="icon-trail" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
