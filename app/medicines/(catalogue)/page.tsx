import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCatalogItems,
  getCatalogSummary,
  type CatalogItem,
  type CatalogSummary,
  type CategorySummary,
  type MoleculeCount,
} from "@/lib/catalog";
import { abs, clip, ogBase } from "@/lib/seo";
import { JsonLd, SITE_ID, breadcrumbNode, type JsonLdNode } from "@/lib/json-ld";
import { categoryCopy, moleculeDescription, moleculeIntro, moleculeTitle } from "@/lib/category-copy";
import { MedicineCatalog } from "@/components/catalog/medicine-catalog";
import { CatalogueHeading, CatalogueSearch } from "@/components/catalog/catalogue-head";
import {
  EMPTY_FILTERS,
  PAGE_SIZE,
  cleanParams,
  passes,
  sortItems,
  type CatalogParams,
  type CategoryLite,
} from "@/components/catalog/catalog-model";

type RawParams = { [K in keyof CatalogParams]?: string | string[] };
type Props = { searchParams: Promise<RawParams> };

/**
 * Params that only re-slice a landing page (search, sort, view, the finer
 * facets): such URLs are crawled for their links but never indexed. Paging is
 * not one of them: "Show more products" is a real ?show= link whose canonical
 * is the landing page.
 */
const NOINDEX_PARAMS = ["q", "sort", "view", "form", "avail", "strength"] as const;

/**
 * The bare catalogue's <title> part (the layout appends the site name) and its
 * description. Category and molecule titles come from lib/category-copy. The
 * in-place tab title in components/catalog/medicine-catalog.tsx repeats these
 * titles; keep the two in step.
 */
const CATALOGUE_TITLE = "Pharmaceutical Export Catalogue";
const CATALOGUE_DESCRIPTION = clip(
  "For licensed importers and distributors: ED medicines, MTP kits, anti-parasitics, pain relief, injectables, aesthetics. One enquiry, one quotation.",
);

/** A category without hand-written copy (one added in the admin panel) is titled by its own name. */
const categoryTitle = (cat: { slug: string; name: string }): string =>
  categoryCopy(cat.slug)?.title ?? `${cat.name} Exporter & Supplier`;

type Landing = {
  items: CatalogItem[];
  summary: CatalogSummary;
  cat?: CategorySummary;
  /** The one molecule of ?molecule=<name>; unset for a list (?molecule=a,b), which is no landing page. */
  mol?: MoleculeCount;
  /** Every known molecule in ?molecule=, in the catalogue's spelling. */
  molecules: MoleculeCount[];
  canonical: string;
  /** The <title> part before the site-name template, and the meta description. */
  title: string;
  description: string;
};

/**
 * Landing pages: /medicines, /medicines?category=<slug> and
 * /medicines?molecule=<name> (the home A–Z, the category bar and product pages
 * link there). Each gets its own canonical, title and description; any other
 * combination points its canonical at the closest landing page
 * (?category=<slug>&molecule=<name> at the molecule page, so it carries the
 * molecule's title too). A category or molecule the catalogue does not have is
 * a 404, never the whole catalogue under a wrong URL — unless the catalogue
 * itself is unavailable, when the page shows its outage state instead of
 * turning every landing URL into a 404.
 */
async function resolveLanding(params: CatalogParams): Promise<Landing> {
  const [items, summary] = await Promise.all([getCatalogItems(), getCatalogSummary()]);
  const catParam = params.category?.toLowerCase();
  const cat = catParam ? summary.categories.find((c) => c.slug.toLowerCase() === catParam) : undefined;

  // ?molecule=a,b: each known molecule once, in the catalogue's spelling (the page matches case-insensitively too).
  const molecules: MoleculeCount[] = [];
  for (const raw of (params.molecule ?? "").split(",")) {
    const key = raw.trim().toLowerCase();
    const hit = key ? summary.molecules.find((m) => m.name.toLowerCase() === key) : undefined;
    if (hit && !molecules.includes(hit)) molecules.push(hit);
  }
  if (items.length && ((catParam && !cat) || (params.molecule && !molecules.length))) notFound();
  const mol = molecules.length === 1 ? molecules[0] : undefined;

  const canonical = mol
    ? `/medicines?molecule=${encodeURIComponent(mol.name)}`
    : cat
      ? `/medicines?category=${encodeURIComponent(cat.slug)}`
      : "/medicines";
  const common = { items, summary, cat, mol, molecules, canonical };

  if (mol) {
    // The products the head's intro describes too (MoleculeScope in medicine-catalog.tsx): the
    // molecule within the active category, if any. moleculeIntro names the first forms and brands.
    const scoped = items.filter((it) => it.molecule === mol.name && (!cat || it.category?.slug === cat.slug));
    const forms = [...new Set(scoped.flatMap((it) => (it.form ? [it.form] : [])))];
    const brands = [...new Set(scoped.map((it) => it.name))];
    // The two-sentence description when it fits, else the intro alone: clipping the pair would
    // cut right after the intro's full stop ("…distributors.…").
    const full = moleculeDescription(mol.name, forms, brands);
    return {
      ...common,
      title: moleculeTitle(mol.name, forms[0]),
      description: clip(full) === full ? full : clip(moleculeIntro(mol.name, forms, brands)),
    };
  }
  if (cat) {
    const lead = (cat.blurb ?? cat.name).trim().replace(/\.$/, "");
    return {
      ...common,
      title: categoryTitle(cat),
      description:
        categoryCopy(cat.slug)?.description ??
        clip(`${lead}. Supplied to licensed importers and distributors; COA and export documents on request.`),
    };
  }
  return { ...common, title: CATALOGUE_TITLE, description: CATALOGUE_DESCRIPTION };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = cleanParams(await searchParams);
  const { mol, molecules, canonical, title, description } = await resolveLanding(params);
  // A molecule with a single product has only that product's page to list (the sitemap leaves it out too).
  const noindex = NOINDEX_PARAMS.some((k) => params[k] !== undefined) || molecules.length > 1 || mol?.count === 1;
  return {
    title,
    description,
    alternates: { canonical },
    // The share image is the site card from ogBase.
    openGraph: { ...ogBase, url: canonical },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * Structured data for a landing page: its breadcrumb (not for the bare
 * catalogue: one crumb is no breadcrumb) and a CollectionPage listing the
 * first page of products as the catalogue renders it (the same pure model,
 * "Recommended" order). No counts, no nested products.
 */
function landingNodes({ items, cat, mol, canonical, description }: Landing): JsonLdNode[] {
  const filters = { ...EMPTY_FILTERS, category: cat?.slug ?? "", molecule: mol ? [mol.name] : [] };
  const firstPage = sortItems(
    items.filter((it) => passes(it, filters)),
    "recommended",
  ).slice(0, PAGE_SIZE);
  const name = cat?.name ?? mol?.name;
  return [
    ...(name ? [breadcrumbNode([{ name: "Products", path: "/medicines" }, { name }])] : []),
    {
      "@type": "CollectionPage",
      "@id": abs(canonical),
      url: abs(canonical),
      name: name ?? "Product catalogue",
      description,
      inLanguage: "en",
      isPartOf: { "@id": SITE_ID },
      mainEntity: {
        "@type": "ItemList",
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        itemListElement: firstPage.map((it, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: abs(`/medicines/${encodeURIComponent(it.id)}`),
        })),
      },
    },
  ];
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
  const landing = await resolveLanding(params);
  const { items, summary, cat, mol } = landing;
  const categories: CategoryLite[] = summary.categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    blurb: c.blurb,
    count: c.count,
  }));

  // Only the three landing pages carry structured data: a re-sliced URL (?q=, ?sort=, ?show=, a
  // category with a molecule…) is canonical to one of them.
  const keys = Object.keys(params);
  const only = (k: keyof CatalogParams) => keys.length === 1 && keys[0] === k;
  const isLanding = keys.length === 0 || (only("category") && !!cat) || (only("molecule") && !!mol);

  // Browse by molecule: the catalogue's A–Z as plain links, so every molecule page is reachable
  // without JavaScript. A category page lists its own molecules; a molecule page the rest of its
  // category, or of the whole catalogue when the molecule spans several. Never counts.
  const molCategories = mol
    ? new Set(items.filter((it) => it.molecule === mol.name).flatMap((it) => (it.category ? [it.category.slug] : [])))
    : null;
  const scopeSlug = cat?.slug ?? (molCategories?.size === 1 ? [...molCategories][0] : undefined);
  const inScope = scopeSlug
    ? new Set(items.filter((it) => it.category?.slug === scopeSlug).flatMap((it) => (it.molecule ? [it.molecule] : [])))
    : null;
  const moleculeLinks = summary.molecules
    .map((m) => m.name)
    .filter((name) => name !== mol?.name && (!inScope || inScope.has(name)));

  return (
    <>
      {isLanding && <JsonLd nodes={landingNodes(landing)} />}
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
      {moleculeLinks.length > 0 && (
        <section className="section" aria-labelledby="catalogue-molecules">
          <div className="container-grid">
            <header className="sec-head">
              <h2 id="catalogue-molecules">Browse by molecule</h2>
            </header>
            <ul className="columns-2 gap-x-8 md:columns-3 lg:columns-4">
              {moleculeLinks.map((name) => (
                <li key={name} className="break-inside-avoid">
                  {/* No prefetch: sixty-odd links in view would each fetch a page. Long names
                      ("Polydeoxyribonucleotide") may break anywhere, so two phone columns never overflow. */}
                  <Link
                    href={`/medicines?molecule=${encodeURIComponent(name)}`}
                    prefetch={false}
                    className="flex min-h-tap items-center text-navy-600 underline decoration-transparent underline-offset-4 [overflow-wrap:anywhere] hover:decoration-current"
                  >
                    {name}
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
