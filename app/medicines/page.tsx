import { getCategories, getMedicines } from "@/lib/catalog";
import { MedicineCatalog } from "@/components/catalog/medicine-catalog";

export const metadata = { title: "Medicines" };

export default async function MedicinesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const [categories, medicines] = await Promise.all([
    getCategories(),
    getMedicines(),
  ]);

  return (
    <div className="overflow-x-clip">
      {/* ---------------- HEADER BAND ---------------- */}
      <section className="bg-mesh relative">
        <div className="pointer-events-none absolute inset-0 bg-plus opacity-90" />
        <div className="container-page relative py-14 lg:py-16">
          <div className="animate-fade-up max-w-2xl">
            <span className="eyebrow">
              <span className="dot" />
              Catalog
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-brand-900 sm:text-5xl">
              <span className="gradient-text">Medicines</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
              Browse our range and send an enquiry for pricing and availability.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- CATALOG ---------------- */}
      <section className="container-page py-12 lg:py-16">
        <MedicineCatalog
          medicines={medicines}
          categories={categories}
          initialCategory={sp.category ?? "all"}
        />
      </section>
    </div>
  );
}
