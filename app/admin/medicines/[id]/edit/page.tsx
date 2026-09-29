import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
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
      <nav aria-label="Breadcrumb">
        <ol className="crumbs">
          <li>
            <Link href="/admin">Dashboard</Link>
          </li>
          <li>
            <Link href="/admin/medicines">Medicines</Link>
          </li>
          <li aria-current="page">Edit</li>
        </ol>
      </nav>

      <header className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="kicker">Editing</p>
          <h1 className="mt-2 break-words text-h2">{medicine.name}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-2">
            {medicine.is_active ? (
              <span className="badge badge-new">
                <span aria-hidden="true" className="h-2 w-2 rounded-sm bg-navy-900" />
                Active
              </span>
            ) : (
              <span className="badge badge-mto">Hidden</span>
            )}
            {medicine.category?.name && <span className="badge">{medicine.category.name}</span>}
          </p>
        </div>
        {medicine.is_active && (
          <Link href={`/medicines/${medicine.id}`} className="btn btn-ghost btn-sm">
            View on site
            <ArrowUpRight aria-hidden="true" />
          </Link>
        )}
      </header>

      <div className="mt-8">
        <MedicineForm categories={categories} medicine={medicine} />
      </div>
    </div>
  );
}
