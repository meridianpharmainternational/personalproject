import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  FileCheck2,
  Globe2,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { site } from "@/lib/site";

export const metadata = { title: "About" };

const VALUES: {
  icon: ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  body: string;
}[] = [
  {
    icon: ShieldCheck,
    tone: "g1",
    title: "Quality assured",
    body: "GMP-grade sourcing with Certificates of Analysis on every batch we ship.",
  },
  {
    icon: FileCheck2,
    tone: "g3",
    title: "Full documentation",
    body: "CoA, COPP, and export dossiers prepared and tailored to your market.",
  },
  {
    icon: Truck,
    tone: "g2",
    title: "Worldwide logistics",
    body: "Dependable lead times with cold-chain and neutral packing options.",
  },
  {
    icon: Globe2,
    tone: "g4",
    title: "Global reach",
    body: `Trusted delivery to ${site.stats.countries}+ countries across regulated markets.`,
  },
];

export default function AboutPage() {
  return (
    <div className="overflow-x-clip">
      {/* ---------------- HEADER BAND ---------------- */}
      <section className="bg-mesh relative">
        <div className="pointer-events-none absolute inset-0 bg-plus opacity-90" />
        <div className="container-page relative py-16 lg:py-24">
          <div className="animate-fade-up max-w-3xl">
            <span className="eyebrow">
              <span className="dot" />
              {site.tagline}
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-brand-900 sm:text-5xl">
              About <span className="gradient-text">{site.name}</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
              {site.fullName} is a pharmaceutical exporter supplying quality
              medicines to buyers across regulated markets — with complete
              documentation on every order.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- INTRO ---------------- */}
      <section className="container-page py-16 lg:py-20">
        <div className="reveal max-w-2xl">
          <span className="eyebrow">
            <span className="dot" />
            Who we are
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">
            A dependable <span className="gradient-text">sourcing partner</span>
          </h2>
        </div>
        <div className="reveal reveal-d1 mt-6 max-w-3xl space-y-4 text-lg leading-relaxed text-slate-600">
          <p>
            {site.name} works with trusted manufacturers to offer a broad range
            of formulations for international buyers. From enquiry to delivery,
            our export desk handles pricing, availability, and the paperwork your
            market requires.
          </p>

          {/* TODO: Company background, years in operation, therapeutic areas,
              certifications (WHO-GMP, ISO), warehousing/cold-chain, and the
              client's export license details. */}
        </div>
      </section>

      {/* ---------------- VALUES / WHAT WE OFFER ---------------- */}
      <section className="bg-brand-50/40 py-16 lg:py-20">
        <div className="container-page">
          <div className="reveal max-w-2xl">
            <span className="eyebrow">
              <span className="dot" />
              What we offer
            </span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">
              Built for <span className="gradient-text">reliable export</span>
            </h2>
            <p className="mt-3 text-slate-600">
              Everything international buyers need in one dependable partner.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className={`tile p-6 reveal ${i ? `reveal-d${Math.min(i, 3)}` : ""}`}
                >
                  <span className={`tile-icon ${v.tone}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-brand-900">
                    {v.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-600">{v.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- QUALITY & COMPLIANCE ---------------- */}
      <section className="container-page py-16 lg:py-20">
        <div className="gradient-border reveal">
          <div className="rounded-[calc(1.5rem-2px)] bg-white p-8 sm:p-12">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="eyebrow">
                  <span className="dot" />
                  Quality &amp; compliance
                </span>
                <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-brand-900 sm:text-3xl">
                  Held to <span className="gradient-text">recognised standards</span>
                </h2>
                <p className="mt-4 text-slate-600">
                  {/* TODO: State certifications and quality processes here (e.g.
                      WHO-GMP, ISO 9001), and the exporter's license number and
                      issuing authority. */}
                  TODO: State certifications and quality processes here (e.g.
                  WHO-GMP, ISO&nbsp;9001), and the exporter&rsquo;s license number
                  and issuing authority.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {site.certifications.map((c) => (
                    <span key={c} className="chip">
                      <BadgeCheck className="h-3.5 w-3.5 text-leaf-600" />
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  "Certificates of Analysis on every batch",
                  "GMP-grade manufacturing partners",
                  "Export dossiers for your market",
                  "Cold-chain & neutral packing options",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-slate-700"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- HOW TO ORDER ---------------- */}
      <section className="bg-brand-50/40 py-16 lg:py-20">
        <div className="container-page">
          <div className="reveal max-w-2xl">
            <span className="eyebrow">
              <span className="dot" />
              How to order
            </span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">
              Simple, <span className="gradient-text">enquiry-led</span> ordering
            </h2>
          </div>
          <p className="reveal reveal-d1 mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">
            Browse the{" "}
            <Link
              href="/medicines"
              className="font-semibold text-brand-600 hover:underline"
            >
              medicines catalog
            </Link>{" "}
            and send an enquiry for the products you need. Our team responds with
            pricing, availability, and export documentation. Pricing and payment
            are handled off-platform.
          </p>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="container-page py-16 lg:py-20">
        <div
          className="relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12"
          style={{ backgroundImage: "var(--brand-gradient)" }}
        >
          <div className="pointer-events-none absolute inset-0 bg-plus opacity-10" />
          <div className="reveal relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
              Let&rsquo;s talk about your requirement
            </h2>
            <p className="mt-3 text-white/85">
              Send us your product list and destination market — we&rsquo;ll
              respond with pricing, availability, and documentation.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/contact"
                className="btn bg-white px-6 py-3 text-brand-800 hover:bg-brand-50"
              >
                Contact us <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/medicines"
                className="btn border border-white/40 px-6 py-3 text-white hover:bg-white/10"
              >
                Browse medicines
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
