import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { EnquiryForm } from "@/components/enquiry/enquiry-form";
import { OpenEnquiryButton } from "@/components/enquiry/open-enquiry-button";
import { contact, site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact the ${site.fullName} export desk for pricing, availability and documentation.`,
};

export default function ContactPage() {
  const wa = whatsappLink();
  // Only real details are listed; placeholders in lib/site.ts come back as null.
  // TODO(content): confirm business hours and time zone before listing them here.
  const hasDirect = Boolean(contact.email || contact.phone || wa || contact.address);

  return (
    <>
      {/* ------------------------------------------------------ page head */}
      <header className="page-head bg-mercator">
        <div className="container-grid">
          <nav aria-label="Breadcrumb">
            <ol className="crumbs">
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <span aria-current="page">Contact</span>
              </li>
            </ol>
          </nav>
          <h1 className="mt-2 max-w-4xl">Contact the export desk</h1>
          <p className="lead mt-4">
            Send a question or a product enquiry. Our export team replies by email with pricing,
            availability and documentation.
          </p>
        </div>
      </header>

      {/* --------------------------------------------- form + side panels */}
      <section className="section">
        <div className="container-grid grid-12 items-start">
          {/* Left: the enquiry form (no scroll-reveal on forms) */}
          <section className="panel col-span-full lg:col-span-7 lg:p-8" aria-labelledby="contact-form-title">
            <h2 id="contact-form-title" className="font-sans text-h3">
              Send an enquiry
            </h2>
            <p className="mt-2 text-fg-muted">
              Tell us what you need: products, quantities, destination market and any documentation
              requirements.
            </p>
            <div className="mt-6">
              <EnquiryForm source="Contact Form" />
            </div>
          </section>

          {/* Right: direct lines, multi-product lists, what happens next */}
          <div className="col-span-full grid gap-6 md:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
            <section className="panel" aria-labelledby="contact-desk">
              <h2 id="contact-desk" className="font-sans text-h4">
                Export desk
              </h2>
              {hasDirect ? (
                <ul className="mt-3 border-t border-rule">
                  {contact.email && (
                    <ContactRow icon={<Mail aria-hidden />} label="Email" href={`mailto:${contact.email}`}>
                      {contact.email}
                    </ContactRow>
                  )}
                  {contact.phone && contact.phoneHref && (
                    <ContactRow icon={<Phone aria-hidden />} label="Phone" href={contact.phoneHref}>
                      {contact.phone}
                    </ContactRow>
                  )}
                  {wa && (
                    <ContactRow icon={<MessageCircle aria-hidden />} label="WhatsApp" href={wa} external>
                      Chat on WhatsApp
                    </ContactRow>
                  )}
                  {contact.address && (
                    <ContactRow icon={<MapPin aria-hidden />} label="Address">
                      {contact.address}
                    </ContactRow>
                  )}
                </ul>
              ) : null}
              <p className={hasDirect ? "mt-4 text-fg-muted" : "mt-2 text-fg-muted"}>
                {hasDirect
                  ? "Or use the form: it reaches the export team directly."
                  : "The form on this page reaches our export team directly, and they reply by email."}
              </p>
            </section>

            <section className="panel corner-ticks" aria-labelledby="contact-list">
              <h2 id="contact-list" className="font-sans text-h4">
                Have several products?
              </h2>
              <p className="mt-2 text-fg-muted">
                Add them to your enquiry list from the catalogue, or paste a list you already have. We match
                it to the catalogue and you send everything as one enquiry.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <OpenEnquiryButton label="Open your enquiry list" className="btn btn-enquire w-full sm:w-auto" />
                <OpenEnquiryButton paste label="Paste a product list" showCount={false} className="btn btn-secondary w-full sm:w-auto" />
              </div>
            </section>

            <section className="md:col-span-2 lg:col-span-1" aria-labelledby="contact-next">
              <h2 id="contact-next" className="font-sans text-h4">
                What happens next
              </h2>
              <table className="ledger mt-3">
                <caption className="sr-only">What happens after you send an enquiry</caption>
                <tbody>
                  <tr>
                    <th scope="row">Reply time</th>
                    <td>Within 1 business day</td>
                  </tr>
                  <tr>
                    <th scope="row">Quote includes</th>
                    <td>Pricing, availability, documentation</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}

function ContactRow({
  icon,
  label,
  href,
  external = false,
  children,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
  external?: boolean;
  children: ReactNode;
}) {
  const body = (
    <>
      <span className="flex-none text-navy-700 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs text-fg-muted">{label}</span>
        <span className={`block break-words font-medium ${href ? "text-navy-600" : "text-fg-strong"}`}>
          {children}
          {external && <span className="sr-only"> (opens in a new tab)</span>}
        </span>
      </span>
    </>
  );
  return (
    <li className="border-b border-rule">
      {href ? (
        <a
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="flex min-h-tap items-center gap-3 py-2.5 underline decoration-transparent underline-offset-4 hover:decoration-current"
        >
          {body}
        </a>
      ) : (
        <div className="flex min-h-tap items-center gap-3 py-2.5">{body}</div>
      )}
    </li>
  );
}
