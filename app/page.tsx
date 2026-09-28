import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ShieldCheck,
  Globe2,
  Package,
  CalendarClock,
  Pill,
  Syringe,
  HeartPulse,
  Stethoscope,
  Truck,
  FileCheck2,
  Headset,
  MapPin,
} from "lucide-react";
import logo from "@/app/assets/logo.png";
import { getCategories, getMedicines } from "@/lib/catalog";
import { MedicineCard } from "@/components/medicine-card";
import { Counter } from "@/components/counter";
import { WorldMap } from "@/components/world-map";
import { EnquiryButton } from "@/components/enquiry/enquiry-button";
import { site } from "@/lib/site";

const CAT_TONES = ["g1", "g3", "g2", "g6", "g4", "g5"] as const;
const CAT_ICONS = [Pill, Syringe, HeartPulse, Stethoscope, Package, ShieldCheck];

const FEATURES: {
  icon: ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  body: string;
}[] = [
  { icon: ShieldCheck, tone: "g1", title: "Quality assured", body: "GMP-grade sourcing with Certificates of Analysis on every batch." },
  { icon: FileCheck2, tone: "g3", title: "Full documentation", body: "CoA, COPP, and export dossiers prepared for your market." },
  { icon: Truck, tone: "g2", title: "Worldwide logistics", body: "Reliable lead times with cold-chain and neutral packing options." },
  { icon: Headset, tone: "g6", title: "Responsive support", body: "A dedicated export desk that replies within one business day." },
];

const REGIONS = ["Asia", "Africa", "Middle East", "Latin America", "CIS", "Europe"];

export default async function HomePage() {
  const [categories, medicines] = await Promise.all([
    getCategories(),
    getMedicines(),
  ]);
  const featured = medicines.slice(0, 6);

  return (
    <div className="overflow-x-clip">
      {/* ---------------- HERO ---------------- */}
      <section className="bg-mesh relative">
        <div className="pointer-events-none absolute inset-0 bg-plus opacity-90" />
        <div className="container-page relative grid gap-12 pb-16 pt-14 md:grid-cols-2 md:items-center lg:pb-24 lg:pt-20">
          <div className="animate-fade-up">
            <span className="eyebrow">
              <span className="dot" />
              {site.certifications.join(" · ")}
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-brand-900 sm:text-5xl lg:text-[3.4rem]">
              Exporting <span className="gradient-text">quality medicines,</span>{" "}
              worldwide.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              {site.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/medicines" className="btn btn-primary px-5 py-3">
                Browse medicines <ArrowRight className="h-4 w-4" />
              </Link>
              <EnquiryButton className="btn btn-outline px-5 py-3" label="Get a quote" />
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {["GMP-grade sourcing", "Full export documentation", "Worldwide logistics"].map(
                (t) => (
                  <li
                    key={t}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600"
                  >
                    <Check className="h-4 w-4 text-leaf-600" />
                    {t}
                  </li>
                ),
              )}
            </ul>
          </div>

          <div
            className="relative hidden animate-fade-up md:block"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="absolute inset-0 -m-10 rounded-full bg-gradient-to-br from-brand-200/40 via-teal-300/30 to-leaf-200/40 blur-3xl" />
            <div className="relative mx-auto flex aspect-square max-w-md items-center justify-center rounded-[2.5rem] border border-border bg-white/70 shadow-soft-lg backdrop-blur">
              <Image
                src={logo}
                alt={site.fullName}
                width={380}
                height={380}
                className="h-[78%] w-[78%] animate-float object-contain"
                priority
              />
            </div>
            <div className="float-a absolute -left-3 top-10 flex items-center gap-3 rounded-2xl border border-border bg-white/95 px-4 py-3 shadow-soft">
              <ShieldCheck className="h-7 w-7 text-leaf-600" />
              <div>
                <p className="text-xs text-slate-500">Compliance</p>
                <p className="text-sm font-bold text-brand-900">WHO-GMP Certified</p>
              </div>
            </div>
            <div className="float-b absolute -right-2 bottom-12 flex items-center gap-3 rounded-2xl border border-border bg-white/95 px-4 py-3 shadow-soft">
              <Globe2 className="h-7 w-7 text-brand-600" />
              <div>
                <p className="text-xs text-slate-500">Shipping to</p>
                <p className="text-sm font-bold text-brand-900">
                  {site.stats.countries}+ Countries
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- CATEGORIES ---------------- */}
      {categories.length > 0 && (
        <section className="container-page py-16 lg:py-20">
          <SectionHeading
            eyebrow="Our range"
            title={
              <>
                Product <span className="gradient-text">categories</span>
              </>
            }
            subtitle="Browse by therapeutic area, then send an enquiry for pricing and availability."
          />
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c, i) => {
              const Icon = CAT_ICONS[i % CAT_ICONS.length];
              return (
                <Link
                  key={c.id}
                  href={`/medicines?category=${c.slug}`}
                  className={`tile group p-6 reveal ${i ? `reveal-d${Math.min(i, 3)}` : ""}`}
                >
                  <span className={`tile-icon ${CAT_TONES[i % CAT_TONES.length]}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-brand-900">
                    {c.name}
                  </h3>
                  {c.blurb && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">
                      {c.blurb}
                    </p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                    Explore{" "}
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------------- FEATURED MEDICINES ---------------- */}
      <section className="bg-brand-50/40 py-16 lg:py-20">
        <div className="container-page">
          <div className="flex items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Catalog"
              title={
                <>
                  Featured <span className="gradient-text">medicines</span>
                </>
              }
              subtitle="A selection from our portfolio."
            />
            <Link
              href="/medicines"
              className="btn btn-outline hidden shrink-0 sm:inline-flex"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {featured.length > 0 ? (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((m, i) => (
                <div key={m.id} className={`reveal ${i % 3 ? `reveal-d${i % 3}` : ""}`}>
                  <MedicineCard m={m} />
                </div>
              ))}
            </div>
          ) : (
            <div className="card mt-10 p-12 text-center">
              <p className="text-slate-600">
                Our catalog is being prepared.{" "}
                <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
                  Send an enquiry
                </Link>{" "}
                and we&rsquo;ll help you source what you need.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- STATS ---------------- */}
      <section className="container-page py-16 lg:py-20">
        <div className="gradient-border reveal">
          <div className="rounded-[calc(1.5rem-2px)] bg-white p-8 sm:p-12">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              <Stat icon={<Package className="h-6 w-6" />} tone="g1" target={site.stats.products} suffix="+" label="Products in portfolio" />
              <Stat icon={<Globe2 className="h-6 w-6" />} tone="g3" target={site.stats.countries} suffix="+" label="Countries served" />
              <Stat icon={<CalendarClock className="h-6 w-6" />} tone="g2" target={site.stats.years} suffix="+" label="Years of experience" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- GLOBAL REACH ---------------- */}
      <section className="relative overflow-hidden bg-brand-900 py-16 text-white lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-plus opacity-[0.12]" />
        <div className="container-page relative grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="reveal">
            <span className="eyebrow border-white/20 bg-white/10 text-white">
              <span className="dot" />
              Global reach
            </span>
            <h2 className="mt-4 font-display text-3xl font-extrabold text-white sm:text-4xl">
              Trusted delivery to{" "}
              <span className="text-leaf-400">{site.stats.countries}+ countries</span>
            </h2>
            <p className="mt-4 max-w-lg text-brand-200">
              From our facilities to your market — with cold-chain options, full
              documentation, and dependable lead times.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm"
                >
                  <MapPin className="h-3.5 w-3.5 text-leaf-400" />
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div className="reveal reveal-d1 relative">
            <WorldMap className="h-auto w-full text-brand-300/70" />
            <Pin left="30%" top="38%" />
            <Pin left="62%" top="30%" delay="0.8s" />
            <Pin left="48%" top="56%" delay="1.6s" />
          </div>
        </div>
      </section>

      {/* ---------------- WHY MERIDIAN ---------------- */}
      <section className="container-page py-16 lg:py-20">
        <SectionHeading
          align="center"
          eyebrow="Why Meridian"
          title={
            <>
              Built for <span className="gradient-text">reliable sourcing</span>
            </>
          }
          subtitle="Everything international buyers need in one dependable partner."
        />
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`tile p-6 reveal ${i ? `reveal-d${Math.min(i, 3)}` : ""}`}
              >
                <span className={`tile-icon ${f.tone}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-brand-900">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm text-slate-600">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="container-page pb-20">
        <div
          className="relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12"
          style={{ backgroundImage: "var(--brand-gradient)" }}
        >
          <div className="pointer-events-none absolute inset-0 bg-plus opacity-10" />
          <div className="reveal relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
              Ready to source your next order?
            </h2>
            <p className="mt-3 text-white/85">
              Send us your requirement and destination market — we&rsquo;ll respond
              with pricing, availability, and documentation.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <EnquiryButton
                className="btn bg-white px-6 py-3 text-brand-800 hover:bg-brand-50"
                label="Get a quote"
              />
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

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={`reveal max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      <span className="eyebrow">
        <span className="dot" />
        {eyebrow}
      </span>
      <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-3 text-slate-600">{subtitle}</p>}
    </div>
  );
}

function Stat({
  icon,
  tone,
  target,
  suffix,
  label,
}: {
  icon: ReactNode;
  tone: string;
  target: number;
  suffix?: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <span className={`tile-icon ${tone} mx-auto`}>{icon}</span>
      <p className="stat-value mt-4 font-display text-4xl sm:text-5xl">
        <Counter target={target} suffix={suffix} />
      </p>
      <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-brand-800">
        {label}
      </p>
    </div>
  );
}

function Pin({ left, top, delay }: { left: string; top: string; delay?: string }) {
  return (
    <span
      className="absolute h-2.5 w-2.5 rounded-full bg-leaf-400"
      style={{ left, top, animation: "ping 2.5s ease-out infinite", animationDelay: delay }}
    />
  );
}
