import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `What ${site.fullName} collects when you send an enquiry, and how it is used.`,
};

// TODO(legal): have the client's counsel review this draft; add the data
// controller's registered details, retention periods and any jurisdiction-
// specific rights. Then pass `updated="<date>"` to <LegalPage/>.
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      current="/privacy"
      intro="What we collect when you send an enquiry, and how we use it."
    >
      <p>
        This policy explains how {site.fullName} handles the information you give us through this
        website.
      </p>

      <LegalSection title="What we collect">
        <p>When you send an enquiry through the contact form or your enquiry list, we collect:</p>
        <ul>
          <li>your name and email address;</li>
          <li>your company, country and phone or WhatsApp number, if you provide them;</li>
          <li>your message, and the products, strengths and quantities you ask about;</li>
          <li>the page of this site you sent the enquiry from.</li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use it">
        <p>
          We use these details to respond to your enquiry, prepare quotations and manage our business
          relationship with you. We do not sell your personal data.
        </p>
      </LegalSection>

      <LegalSection title="Who can see it">
        <p>
          Enquiries are available to authorised members of our team. We use service providers to host
          this website, store enquiries and send enquiry notifications by email; they handle the data on
          our behalf.
        </p>
      </LegalSection>

      <LegalSection title="Stored on your device">
        <p>
          Your enquiry list is kept in your browser&rsquo;s local storage until you send or clear it. If
          you tick &ldquo;Remember my details on this device&rdquo;, your name, email, country, company and
          phone number are also saved there, so the form is filled in next time. This information stays on
          your device. Untick the option when you next send an enquiry, or clear your browser&rsquo;s site
          data, to remove it.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          We keep enquiry records for as long as we need them to respond to you and to manage the business
          relationship.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <p>
          To ask about, correct or delete the details you have sent us, contact us through the{" "}
          <Link href="/contact">contact page</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>We may update this policy from time to time. The version published on this page is the one that applies.</p>
      </LegalSection>
    </LegalPage>
  );
}
