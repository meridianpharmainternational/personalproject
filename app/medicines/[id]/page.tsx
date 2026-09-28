import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { getMedicineById } from "@/lib/catalog";
import { parseStrengths } from "@/lib/format";
import { medicineImageUrl } from "@/lib/storage";
import { EnquiryButton } from "@/components/enquiry/enquiry-button";
import { enquiryLabel } from "@/components/medicine-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const m = await getMedicineById(id);
  return { title: m ? m.name : "Medicine" };
}

export default async function MedicineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const m = await getMedicineById(id);
  if (!m) notFound();

  const img = medicineImageUrl(m.image_path);
  const strengths = parseStrengths(m.strengths);
  const label = enquiryLabel(m);

  return (
    <div className="overflow-x-clip">
      <section className="bg-mesh relative">
        <div className="pointer-events-none absolute inset-0 bg-plus opacity-90" />
        <div className="container-page relative py-12 lg:py-16">
          <Link
            href="/medicines"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
            Back to medicines
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:items-start">
            {/* ---------------- IMAGE PANEL ---------------- */}
            <div className="animate-fade-up relative">
              <div className="pointer-events-none absolute inset-0 -m-6 rounded-full bg-gradient-to-br from-brand-200/40 via-teal-300/30 to-leaf-200/40 blur-3xl" />
              <div className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-soft-lg">
                <div className="aspect-[4/3] w-full bg-surface">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={m.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 via-white to-leaf-50 px-6 text-center">
                      <span className="font-display text-2xl font-extrabold text-brand-800">
                        {m.name}
                      </span>
                    </div>
                  )}
                </div>
                {m.availability === "made-to-order" && (
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-800 shadow-soft backdrop-blur">
                    Made to order
                  </span>
                )}
              </div>
            </div>

            {/* ---------------- DETAILS ---------------- */}
            <div
              className="animate-fade-up"
              style={{ animationDelay: "0.12s" }}
            >
              {m.category?.name && (
                <span className="chip">{m.category.name}</span>
              )}
              <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">
                {m.name}
              </h1>
              {m.molecule && (
                <p className="mt-2 text-lg text-slate-500">{m.molecule}</p>
              )}
              {m.description && (
                <p className="mt-5 leading-relaxed text-slate-600">
                  {m.description}
                </p>
              )}

              <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Spec label="Form" value={m.form} />
                <Spec label="Strengths" value={strengths.join(", ") || null} />
                <Spec label="Pack" value={m.pack} />
                <Spec label="MOQ" value={m.moq} />
                <Spec label="Lead time" value={m.lead_time} />
                <Spec
                  label="Availability"
                  value={
                    m.availability === "in-stock" ? "In stock" : "Made to order"
                  }
                />
              </dl>

              {m.note && (
                <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p>{m.note}</p>
                </div>
              )}

              <div className="mt-8">
                <EnquiryButton
                  product={label}
                  className="btn btn-primary px-6 py-3"
                  label="Enquire about this medicine"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Spec({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-border bg-brand-50/50 px-4 py-3">
      <dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 font-bold text-brand-900">{value}</dd>
    </div>
  );
}
