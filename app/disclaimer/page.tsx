import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: `Important information about the product details shown on the ${site.fullName} website.`,
};

// TODO(legal): have the client's counsel review this draft, then pass
// `updated="<date>"` to <LegalPage/>.
export default function DisclaimerPage() {
  return (
    <LegalPage
      title="Disclaimer"
      current="/disclaimer"
      intro="Important information about the product details shown on this site."
    >
      <p>
        Please read this disclaimer together with our <Link href="/terms">terms of use</Link>.
      </p>

      <LegalSection title="Not medical advice">
        <p>
          Information on this site is for general product reference by business buyers. It is not medical
          advice. Consult a qualified healthcare professional about the use of any medicine.
        </p>
      </LegalSection>

      <LegalSection title="Business buyers only">
        <p>
          This site does not sell to consumers. Products are supplied only to licensed importers and
          distributors, subject to the regulations of the destination country.
        </p>
      </LegalSection>

      <LegalSection title="Regulatory status">
        <p>
          The availability and legal status of products vary by country. Some products are controlled, or
          need an import permit, in the destination market. Buyers are responsible for confirming the
          status of each product before they order.
        </p>
      </LegalSection>

      <LegalSection title="Product information">
        <p>
          We take care to keep product details accurate, but names, strengths, pack sizes, availability and
          lead times may change without notice. Images are illustrative. Please confirm the specification
          with our export team before you order.
        </p>
      </LegalSection>

      <LegalSection title="Names and trademarks">
        <p>
          Brand and product names belong to their respective owners. Their appearance on this site does not
          imply endorsement.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
