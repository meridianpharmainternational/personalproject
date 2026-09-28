import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
        TODO: Placeholder text. Replace with a privacy policy reviewed by the
        client&rsquo;s legal counsel before going live.
      </p>
      <LegalSection title="What we collect">
        When you submit an enquiry we collect the details you provide (name,
        email, phone, company, country, message, and the product you asked about)
        so we can respond to you.
      </LegalSection>
      <LegalSection title="How we use it">
        Enquiry details are used solely to respond to your enquiry and manage the
        business relationship. We do not sell your data.
      </LegalSection>
      <LegalSection title="TODO — retention, contact, and rights">
        Data retention period, your rights, and how to contact us about your data
        to be completed by counsel.
      </LegalSection>
    </LegalPage>
  );
}
