import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DOCS } from "@/lib/docs";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `${site.fullName} supplies finished pharmaceutical formulations to licensed importers and distributors. One enquiry list, one quotation.`,
};

export default function AboutPage() {
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

      {/* TODO(content): add company background once confirmed by the client — years
          in operation, export licence number and issuing authority, warehousing. */}
      <section className="section" aria-labelledby="about-how">
        <div className="container-grid">
          <div className="measure space-y-4">
            <h2 id="about-how">How we work</h2>
            <p>
              We supply businesses that are licensed to buy pharmaceuticals, never consumers. Browse the catalogue, add
              the products you need to one enquiry list and send it in one go.
            </p>
            <p>Our export team replies with pricing, availability and the documents your market needs.</p>
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
    </>
  );
}
