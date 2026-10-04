import type { Metadata } from "next";
import { getCatalogItems, getCatalogSummary, type MoleculeCount } from "@/lib/catalog";
import { site } from "@/lib/site";
import { MedicineCatalog } from "@/components/catalog/medicine-catalog";
import { CatalogueHeading, CatalogueSearch } from "@/components/catalog/catalogue-head";
import { cleanParams, type CatalogParams, type CategoryLite } from "@/components/catalog/catalog-model";

type RawParams = { [K in keyof CatalogParams]?: string | string[] };
type Props = { searchParams: Promise<RawParams> };

/**
 * Params that only re-slice a landing page (search, sort, view, paging, the
 * finer facets): such URLs are crawled for their links but never indexed.
 */
const NOINDEX_PARAMS = ["q", "sort", "view", "show", "form", "avail", "strength"] as const;

const products = (n: number) => `${n} product${n === 1 ? "" : "s"}`;

/**
 * Landing pages: /medicines, /medicines?category=<slug> and
 * /medicines?molecule=<name> (the home A–Z and product pages link there). Each
 * gets its own canonical, title and description; any other combination points
 * its canonical at the closest landing page.
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = cleanParams(await searchParams);
  const summary = await getCatalogSummary();
  const catParam = params.category?.toLowerCase();
  const cat = catParam ? summary.categories.find((c) => c.slug.toLowerCase() === catParam) : undefined;

  // ?molecule=a,b: each known molecule once, in the catalogue's spelling (the page matches case-insensitively too).
  const molecules: MoleculeCount[] = [];
  for (const raw of (params.molecule ?? "").split(",")) {
    const key = raw.trim().toLowerCase();
    const hit = key ? summary.molecules.find((m) => m.name.toLowerCase() === key) : undefined;
    if (hit && !molecules.includes(hit)) molecules.push(hit);
  }
  const mol = molecules.length === 1 ? molecules[0] : undefined;

  const canonical = mol
    ? `/medicines?molecule=${encodeURIComponent(mol.name)}`
    : cat
      ? `/medicines?category=${encodeURIComponent(cat.slug)}`
      : "/medicines";
  const noindex = NOINDEX_PARAMS.some((k) => params[k] !== undefined) || molecules.length > 1;
  const common: Metadata = {
    alternates: { canonical },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };

  if (mol) {
    // The same cached catalogue the page renders from, so the count matches the results.
    const items = (await getCatalogItems()).filter(
      (it) => it.molecule === mol.name && (!cat || it.category?.slug === cat.slug),
    );
    const count = items.length;
    const forms = [...new Set(items.flatMap((it) => (it.form ? [it.form] : [])))].slice(0, 3);
    return {
      ...common,
      title: cat ? `${mol.name} in ${cat.name} — ${products(count)}` : `${mol.name} — ${products(count)}`,
      description: [
        `${mol.name} from ${site.fullName}: ${products(count)}${cat ? ` in ${cat.name}` : ""}${
          forms.length ? ` (${forms.join(", ")})` : ""
        }.`,
        "Add any of them to one enquiry list for pricing, availability and documents.",
      ].join(" "),
    };
  }
  if (cat) {
    return {
      ...common,
      title: cat.name,
      description: [
        cat.blurb,
        `${cat.count} ${cat.name} products in the ${site.fullName} catalogue.`,
        "Add any of them to one enquiry list for pricing, availability and documents.",
      ]
        .filter(Boolean)
        .join(" "),
    };
  }
  return {
    ...common,
    title: "Product catalogue",
    description: `Browse ${summary.total} products across ${summary.categoryCount} categories and ${summary.moleculeCount} molecules. Add any product to one enquiry list for pricing, availability and documents.`,
  };
}

/**
 * /medicines — the public catalogue. Server component: loads the lean
 * catalogue once and renders the page head; <MedicineCatalog> (client) does
 * all searching, filtering, sorting and paging over it. The key re-initialises
 * the catalogue when a link (category bar, header search) navigates here with
 * different params.
 *
 * The head is deliberately compact so the first row of products shows above
 * the fold: tighter padding than the default .page-head, an h1 set at the h2
 * size (in CatalogueHeading), and from lg the heading and the search sit side
 * by side. loading.tsx mirrors this layout; keep the two in step.
 */
export default async function MedicinesPage({ searchParams }: Props) {
  const params = cleanParams(await searchParams);
  const [items, summary] = await Promise.all([getCatalogItems(), getCatalogSummary()]);
  const categories: CategoryLite[] = summary.categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    blurb: c.blurb,
    count: c.count,
  }));

  return (
    <MedicineCatalog
      key={JSON.stringify(params)}
      items={items}
      categories={categories}
      initial={params}
      head={
        <header className="page-head">
          <div className="container-grid lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-end lg:gap-x-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,36rem)]">
            <div className="min-w-0">
              <CatalogueHeading />
            </div>
            <CatalogueSearch />
          </div>
        </header>
      }
    />
  );
}
