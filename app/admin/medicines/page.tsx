import Link from "next/link";
import { Plus } from "lucide-react";
import { adminGetCategories, adminGetMedicines } from "@/lib/admin/data";
import { parseStrengths } from "@/lib/format";
import { medicineImageUrl } from "@/lib/storage";
import { MedicineTable, type AdminMedicineRow } from "@/components/admin/medicine-table";

export const metadata = { title: "Medicines" };

export default async function AdminMedicinesPage() {
  const [medicines, categories] = await Promise.all([adminGetMedicines(), adminGetCategories()]);

  // Lean rows for the client table (no descriptions).
  const rows: AdminMedicineRow[] = medicines.map((m) => ({
    id: m.id,
    name: m.name,
    molecule: m.molecule,
    form: m.form,
    strengths: parseStrengths(m.strengths),
    categoryId: m.category_id,
    categoryName: m.category?.name ?? null,
    isActive: m.is_active,
    image: medicineImageUrl(m.image_path),
  }));

  const active = rows.filter((r) => r.isActive).length;
  const categoryOptions = categories.map((c) => ({
    id: c.id,
    name: c.name,
    count: rows.filter((r) => r.categoryId === c.id).length,
  }));

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Catalogue</p>
          <h1 className="mt-2 text-h2">Medicines</h1>
          <p className="mt-2 text-fg-muted">
            <span className="font-mono">{rows.length}</span> products ·{" "}
            <span className="font-mono">{active}</span> active ·{" "}
            <span className="font-mono">{rows.length - active}</span> hidden
          </p>
        </div>
        <Link href="/admin/medicines/new" className="btn btn-primary">
          <Plus aria-hidden="true" />
          Add medicine
        </Link>
      </header>

      <div className="mt-8">
        <MedicineTable rows={rows} categories={categoryOptions} />
      </div>
    </div>
  );
}
