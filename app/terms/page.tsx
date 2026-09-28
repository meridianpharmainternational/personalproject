import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
        TODO: Placeholder text. Replace with terms approved by the client&rsquo;s
        legal counsel before going live.
      </p>
      <LegalSection title="1. Use of this site">
        This website provides product information and an enquiry facility. It does
        not sell to consumers and does not process payments online.
      </LegalSection>
      <LegalSection title="2. Enquiries">
        Submitting an enquiry does not constitute an order or a binding offer.
        Pricing, availability, and terms are confirmed separately by our team.
      </LegalSection>
      <LegalSection title="3. Regulatory responsibility">
        Buyers are responsible for holding all applicable import permits and
        authorizations for their destination market.
      </LegalSection>
      <LegalSection title="4. TODO — remaining clauses">
        Warranties, limitation of liability, governing law, and dispute
        resolution to be completed by counsel.
      </LegalSection>
    </LegalPage>
  );
}
