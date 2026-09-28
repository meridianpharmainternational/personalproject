import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { adminGetCategories, adminGetMedicine } from "@/lib/admin/data";
import { MedicineForm } from "@/components/admin/medicine-form";

export const metadata = { title: "Edit medicine" };

export default async function EditMedicinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [categories, medicine] = await Promise.all([
    adminGetCategories(),
    adminGetMedicine(id),
  ]);
  if (!medicine) notFound();

  return (
    <div>
      <Link
        href="/admin/medicines"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to medicines
      </Link>
      <div className="mt-4">
        <span className="eyebrow">
          <span className="dot" />
          Editing
        </span>
        <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-brand-900 sm:text-3xl">
          Edit <span className="gradient-text">{medicine.name}</span>
        </h2>
      </div>
      <div className="mt-8">
        <MedicineForm categories={categories} medicine={medicine} />
      </div>
    </div>
  );
}
