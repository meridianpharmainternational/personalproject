import type { ComponentType } from "react";
import { Mail, Phone, MapPin, MessageCircle, Clock, ArrowRight } from "lucide-react";
import { EnquiryForm } from "@/components/enquiry/enquiry-form";
import { site, whatsappLink } from "@/lib/site";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  const wa = whatsappLink();

  return (
    <div className="overflow-x-clip">
      {/* ---------------- HEADER BAND ---------------- */}
      <section className="bg-mesh relative">
        <div className="pointer-events-none absolute inset-0 bg-plus opacity-90" />
        <div className="container-page relative py-14 lg:py-20">
          <div className="max-w-2xl animate-fade-up">
            <span className="eyebrow">
              <span className="dot" />
              Contact
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-brand-900 sm:text-5xl">
              Let&rsquo;s talk about your{" "}
              <span className="gradient-text">next order.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Send an enquiry and our export desk will respond with pricing,
              availability, and full documentation.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- FORM + CONTACT METHODS ---------------- */}
      <section className="container-page py-16 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-5 lg:gap-10">
          {/* LEFT — enquiry form */}
          <div className="reveal lg:col-span-3">
            <div className="card p-6 sm:p-8">
              <span className="eyebrow">
                <span className="dot" />
                Enquiry
              </span>
              <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-brand-900">
                Send an <span className="gradient-text">enquiry</span>
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Tell us what you need — quantities, destination market, and any
                documentation requirements.
              </p>
              <div className="mt-6">
                <EnquiryForm source="Contact Form" />
              </div>
            </div>
          </div>

          {/* RIGHT — reach us directly */}
          <div className="reveal reveal-d1 lg:col-span-2">
            <span className="eyebrow">
              <span className="dot" />
              Direct lines
            </span>
            <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-brand-900">
              Reach us <span className="gradient-text">directly</span>
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Prefer to reach out yourself? Use any of the channels below.
            </p>

            <div className="mt-6 space-y-4">
              <ContactMethod
                icon={Mail}
                tone="g1"
                label="Email"
                value={site.email}
                href={`mailto:${site.email}`}
              />
              <ContactMethod
                icon={Phone}
                tone="g2"
                label="Phone"
                value={site.phone}
                href={`tel:${site.phone.replace(/\s+/g, "")}`}
              />
              <ContactMethod
                icon={MapPin}
                tone="g4"
                label="Address"
                value={site.address}
              />
            </div>

            {wa && (
              <a href={wa} className="btn btn-accent mt-6 w-full">
                <MessageCircle className="h-4 w-4" />
                Chat on WhatsApp
                <ArrowRight className="h-4 w-4" />
              </a>
            )}

            {/* Business hours */}
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
              <span className="tile-icon g3 h-11 w-11 shrink-0">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-brand-900">
                  Business hours
                </p>
                {/* TODO: confirm real business hours, timezone, and holiday schedule. */}
                <p className="mt-0.5 text-sm text-slate-600">
                  Mon&ndash;Fri, 9:00&ndash;18:00 (local time). We reply to most
                  enquiries within one business day.
                </p>
              </div>
            </div>

            {/* TODO: map embed, additional regional desks. */}
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactMethod({
  icon: Icon,
  tone,
  label,
  value,
  href,
}: {
  icon: ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <>
      <span className={`tile-icon ${tone} h-12 w-12 shrink-0`}>
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-leaf-700">
          {label}
        </p>
        <p className="mt-0.5 break-words font-medium text-brand-900">{value}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="card group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
      >
        {body}
      </a>
    );
  }

  return <div className="card flex items-center gap-4 p-4">{body}</div>;
}
