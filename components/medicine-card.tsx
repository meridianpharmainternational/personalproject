import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { medicineImageUrl } from "@/lib/storage";
import { parseStrengths } from "@/lib/format";
import { EnquiryButton } from "@/components/enquiry/enquiry-button";
import type { MedicineWithCategory } from "@/types/db";

/** Label used when enquiring, e.g. "Cenforce (Sildenafil Citrate)". */
export function enquiryLabel(m: {
  name: string;
  molecule?: string | null;
}): string {
  return m.molecule ? `${m.name} (${m.molecule})` : m.name;
}

export function MedicineCard({ m }: { m: MedicineWithCategory }) {
  const img = medicineImageUrl(m.image_path);
  const strengths = parseStrengths(m.strengths);

  return (
    <article className="tile group flex flex-col">
      <Link href={`/medicines/${m.id}`} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={m.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 via-white to-leaf-50 px-4 text-center">
              <span className="font-display text-lg font-extrabold text-brand-800">
                {m.name}
              </span>
            </div>
          )}
          {m.availability === "made-to-order" && (
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[0.68rem] font-semibold text-brand-800 shadow-soft backdrop-blur">
              Made to order
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {m.category?.name && (
          <span className="text-xs font-semibold uppercase tracking-wide text-leaf-700">
            {m.category.name}
          </span>
        )}
        <Link
          href={`/medicines/${m.id}`}
          className="mt-1 font-display text-lg font-bold text-brand-900 transition group-hover:text-brand-600"
        >
          {m.name}
        </Link>
        {m.molecule && <p className="text-sm text-slate-500">{m.molecule}</p>}

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {m.form && <Tag>{m.form}</Tag>}
          {strengths.slice(0, 3).map((s) => (
            <Tag key={s}>{s}</Tag>
          ))}
        </div>

        {m.description && (
          <p className="mt-2.5 line-clamp-2 text-sm text-slate-600">
            {m.description}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2 pt-1">
          <EnquiryButton
            product={enquiryLabel(m)}
            className="btn btn-primary flex-1"
          />
          <Link
            href={`/medicines/${m.id}`}
            className="btn btn-outline"
            aria-label={`View ${m.name}`}
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
      {children}
    </span>
  );
}
