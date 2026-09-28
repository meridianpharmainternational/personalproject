"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { MedicineCard } from "@/components/medicine-card";
import { inputClass } from "@/components/ui/field";
import type { Category, MedicineWithCategory } from "@/types/db";

/** Client-side search + category filter over the medicine list. */
export function MedicineCatalog({
  medicines,
  categories,
  initialCategory = "all",
}: {
  medicines: MedicineWithCategory[];
  categories: Category[];
  initialCategory?: string;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>(initialCategory);

  const usedCategories = useMemo(
    () =>
      categories.filter((c) =>
        medicines.some((m) => m.category?.slug === c.slug),
      ),
    [categories, medicines],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const tokens = query.split(/\s+/).filter(Boolean);
    return medicines.filter((m) => {
      if (cat !== "all" && m.category?.slug !== cat) return false;
      if (tokens.length === 0) return true;
      const hay =
        `${m.name} ${m.molecule ?? ""} ${m.strengths ?? ""} ${m.form ?? ""} ${m.category?.name ?? ""} ${m.description ?? ""}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [medicines, q, cat]);

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputClass} pl-10`}
            placeholder="Search medicines…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search medicines"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip active={cat === "all"} onClick={() => setCat("all")}>
            All
          </Chip>
          {usedCategories.map((c) => (
            <Chip
              key={c.slug}
              active={cat === c.slug}
              onClick={() => setCat(c.slug)}
            >
              {c.name}
            </Chip>
          ))}
        </div>
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">
        {filtered.length} medicine{filtered.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <div className="card mt-4 p-12 text-center">
          <p className="text-slate-600">
            No medicines match your search.
          </p>
          <p className="mt-1.5 text-sm text-slate-500">
            Try a different keyword or category.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <MedicineCard key={m.id} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active
          ? "bg-brand text-white shadow-soft"
          : "bg-brand-50 text-brand-700 hover:bg-brand-100"
      }`}
    >
      {children}
    </button>
  );
}
