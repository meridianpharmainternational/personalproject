import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata = { title: "Disclaimer" };

export default function DisclaimerPage() {
  return (
    <LegalPage title="Disclaimer">
      <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
        TODO: Placeholder text. Replace with a disclaimer reviewed by the
        client&rsquo;s legal counsel before going live.
      </p>
      <LegalSection title="Not medical advice">
        Information on this site is for general product reference only and is not
        medical advice. Consult a qualified healthcare professional regarding any
        medicine.
      </LegalSection>
      <LegalSection title="Regulatory status">
        Availability and legal status of products vary by country. Some products
        are controlled or require import permits in the destination market.
      </LegalSection>
    </LegalPage>
  );
}
