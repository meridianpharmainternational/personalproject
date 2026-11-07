import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DOCS } from "@/lib/docs";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  "/about",
  "About us",
  `${site.fullName} supplies finished pharmaceutical formulations to licensed importers and distributors. One enquiry list, one quotation.`,
);

/** Company identity from lib/site.ts, widened from its `as const` literals so each field reads as a plain string. */
const company: Record<keyof typeof site.company, string> = site.company;

/** Answers restate what the site already says elsewhere, built from the same lib/site.ts values. */
const QUESTIONS = [
  {
    q: "What is the minimum order?",
    a: "Quoted per product with your quotation; there is no fixed catalogue-wide minimum.",
  },
  {
    q: "Which documents come with an order?",
    a: `COA, COPP and the manufacturer's ${site.certifications.join(", ")} certificates are available on request with your quotation.`,
  },
  {
    q: "Who can buy from you?",
    a: "Licensed importers and distributors only; we do not supply consumers or individuals.",
  },
  {
    q: "Where do you ship, and how long does delivery take?",
    a: `${site.exportReach.long} ${site.shipping.us}. Standard delivery ${site.shipping.standard}; express ${site.shipping.express}. ${site.exportReach.note}`,
  },
  { q: "Which payment methods do you accept?", a: `${site.payments.join(", ")}.` },
  {
    q: "Do you supply controlled products?",
    a: "Some products are controlled or need an import permit in the destination market; buyers confirm the status before ordering.",
  },
];

export default function AboutPage() {
  const terms: { key: string; value: string }[] = [
    { key: "Processing", value: site.shipping.processing },
    { key: "Standard delivery", value: site.shipping.standard },
    { key: "Express delivery", value: site.shipping.express },
    { key: "Payments we accept", value: site.payments.join(" · ") },
    { key: "Export desk", value: `${site.deskHours}. Replies within one business day.` },
  ];
  // Registration details for the "Company" ledger. Every site.company field is empty until the
  // owner supplies the documents, so the section stays hidden rather than showing placeholders.
  const companyRows: { key: string; value: string }[] = [
    { key: "Legal name", value: company.legalName },
    { key: "Established", value: company.established },
    { key: "Country of operation", value: company.country },
    { key: "Importer-Exporter Code (IEC)", value: company.iec },
    {
      key: "Drug licence",
      value:
        company.drugLicence && company.drugLicenceAuthority
          ? `${company.drugLicence} (${company.drugLicenceAuthority})`
          : company.drugLicence,
    },
    { key: "GSTIN", value: company.gstin },
  ].filter((r) => r.value);

  return (
    <>
      <header className="page-head">
        <div className="container-grid">
          <h1 className="max-w-4xl">About us</h1>
          <p className="lead mt-4">
            {site.fullName} supplies finished pharmaceutical formulations to licensed importers and distributors
            worldwide.
          </p>
        </div>
      </header>

      {/* TODO(content): add company background once confirmed by the client — years in
          operation and warehousing. Registration details go in site.company (lib/site.ts). */}
      <section className="section" aria-labelledby="about-how">
        <div className="container-grid">
          <div className="measure space-y-4">
            <h2 id="about-how">How we work</h2>
            <p>
              We supply businesses that are licensed to buy pharmaceuticals, never consumers. Browse the catalogue, add
              the products you need to one enquiry list and send it in one go. Controlled products ship only against the
              destination import permit.
            </p>
            <p>
              {site.catalogueSize} products are available to order; the catalogue shows our most requested lines.
              Our export team replies with pricing, availability and the documents your market needs.
            </p>
            <Link href="/medicines" className="link-arrow">
              Browse products
              <ArrowRight aria-hidden strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section surface-paper" aria-labelledby="about-quality">
        <div className="container-grid">
          <header className="sec-head">
            <div>
              <h2 id="about-quality">Quality and documents</h2>
              <p className="lead">All available on request with your quotation.</p>
            </div>
          </header>
          <ul className="doc-list">
            {DOCS.map((d) => (
              <li key={d.name}>
                <span className="doc-list-name">{d.name}</span>
                <span className="doc-list-scope">{d.scope}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="about-shipping">
        <div className="container-grid">
          <div className="max-w-3xl">
            <h2 id="about-shipping">Shipping and payment</h2>
            <p className="lead mt-2">
              {site.exportReach.long} {site.shipping.us}. {site.exportReach.note}
            </p>
            <table className="ledger mt-8">
              <caption className="sr-only">Shipping and payment</caption>
              <tbody>
                {terms.map((r) => (
                  <tr key={r.key}>
                    <th scope="row">{r.key}</th>
                    <td>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {companyRows.length > 0 && (
        <section className="section" aria-labelledby="about-company">
          <div className="container-grid">
            <div className="max-w-3xl">
              <h2 id="about-company">Company</h2>
              <table className="ledger mt-8">
                <caption className="sr-only">Company</caption>
                <tbody>
                  {companyRows.map((r) => (
                    <tr key={r.key}>
                      <th scope="row">{r.key}</th>
                      <td>{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="section surface-paper" aria-labelledby="about-faq">
        <div className="container-grid">
          <div className="measure">
            <h2 id="about-faq">Common questions</h2>
            <dl className="mt-6 border-t border-rule">
              {QUESTIONS.map((item) => (
                <div key={item.q} className="border-b border-rule py-4">
                  <dt className="font-semibold text-fg-strong">{item.q}</dt>
                  <dd className="mt-1 text-fg-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
            <Link href="/contact" className="link-arrow mt-6">
              Get a quote
              <ArrowRight aria-hidden strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
