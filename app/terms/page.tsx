import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `The terms that apply when you use the ${site.fullName} website and send an enquiry.`,
};

// TODO(legal): have the client's counsel review this draft and add warranties,
// limitation of liability, governing law and dispute resolution. Then pass
// `updated="<date>"` to <LegalPage/> so the "Last updated" line appears.
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      current="/terms"
      intro="The terms that apply when you use this website and send us an enquiry."
    >
      <p>
        By using this website you agree to these terms. If you do not agree, please do not use the site
        or send enquiries through it.
      </p>

      <LegalSection title="1. About this site">
        <p>
          This website is operated by {site.fullName}. It provides product information and an enquiry
          facility for business buyers. It does not sell to consumers and does not take orders or
          payments online.
        </p>
      </LegalSection>

      <LegalSection title="2. Who the site is for">
        <p>
          The catalogue is intended for licensed importers, distributors and other businesses that are
          authorised to buy pharmaceutical products. Products are supplied only to licensed importers and
          distributors, subject to the regulations of the destination country.
        </p>
      </LegalSection>

      <LegalSection title="3. Enquiries and quotations">
        <p>
          Sending an enquiry, including an enquiry list, does not place an order and is not a binding
          offer by either party. Pricing, availability, lead times and documentation are confirmed by our
          export team in writing. Any supply is made only under terms agreed separately in writing.
        </p>
      </LegalSection>

      <LegalSection title="4. Regulatory responsibility">
        <p>
          Buyers are responsible for holding every import permit, licence and authorisation required in
          their destination market, and for complying with local rules on the import, storage and
          distribution of the products they buy.
        </p>
      </LegalSection>

      <LegalSection title="5. Product information">
        <p>
          Product names, strengths, pack sizes and other details are provided for reference and may change
          without notice. Images are illustrative. Please confirm the specification with our team before
          relying on it. See the <Link href="/disclaimer">disclaimer</Link> for more.
        </p>
      </LegalSection>

      <LegalSection title="6. Names and trademarks">
        <p>
          Brand and product names shown in the catalogue belong to their respective owners. Their
          appearance on this site does not imply endorsement.
        </p>
      </LegalSection>

      <LegalSection title="7. Changes to the site and these terms">
        <p>
          We may update the website, the catalogue or these terms at any time. The version published on
          this page is the one that applies.
        </p>
      </LegalSection>

      <LegalSection title="8. Contact">
        <p>
          Questions about these terms can be sent through the <Link href="/contact">contact page</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
