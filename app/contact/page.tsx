import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { EnquiryForm } from "@/components/enquiry/enquiry-form";
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
      <header className="page-head">
        <div className="container-grid">
          <h1 className="max-w-4xl">Contact us</h1>
          <p className="lead mt-4">
            Send a question or a product enquiry. Our export team replies by email within one business day.
          </p>
        </div>
      </header>

      <section className="section">
        <div className="container-grid grid-12 items-start gap-y-12">
          <section className="col-span-full lg:col-span-7" aria-labelledby="contact-form-title">
            <h2 id="contact-form-title" className="sr-only">
              Send an enquiry
            </h2>
            <EnquiryForm source="Contact Form" />
          </section>

          {hasDirect && (
            <aside className="col-span-full lg:col-span-4 lg:col-start-9" aria-labelledby="contact-desk">
              <h2 id="contact-desk" className="font-sans text-h4">
                Export desk
              </h2>
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
            </aside>
          )}
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
