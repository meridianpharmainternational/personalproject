import Link from "next/link";
import { Plus, Pill, Pencil } from "lucide-react";
import { adminGetMedicines } from "@/lib/admin/data";
import { DeleteMedicineButton } from "@/components/admin/delete-medicine-button";

export const metadata = { title: "Medicines" };

export default async function AdminMedicinesPage() {
  const medicines = await adminGetMedicines();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">
            <span className="dot" />
            Catalog
          </span>
          <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-brand-900 sm:text-3xl">
            <span className="gradient-text">Medicines</span>{" "}
            <span className="align-middle text-lg font-semibold text-slate-400">
              ({medicines.length})
            </span>
          </h2>
        </div>
        <Link href="/admin/medicines/new" className="btn btn-primary px-5 py-3">
          <Plus className="h-4 w-4" /> Add medicine
        </Link>
      </div>

      {medicines.length === 0 ? (
        <div className="card reveal mt-8 p-12 text-center">
          <span className="tile-icon g1 mx-auto">
            <Pill className="h-6 w-6" />
          </span>
          <p className="mt-5 font-display text-lg font-bold text-brand-900">
            No medicines yet
          </p>
          <p className="mt-1.5 text-sm text-slate-600">
            Click &ldquo;Add medicine&rdquo; to create your first one.
          </p>
          <Link
            href="/admin/medicines/new"
            className="btn btn-primary mt-6 px-5 py-3"
          >
            <Plus className="h-4 w-4" /> Add medicine
          </Link>
        </div>
      ) : (
        <div className="card reveal mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left">
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-brand-800">
                  Name
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-brand-800">
                  Category
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-brand-800">
                  Form
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-brand-800">
                  Status
                </th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {medicines.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-brand-100/60 transition-colors last:border-0 hover:bg-brand-50/40"
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-brand-900">{m.name}</div>
                    {m.molecule && (
                      <div className="text-xs text-slate-500">{m.molecule}</div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {m.category?.name ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{m.form ?? "—"}</td>
                  <td className="px-5 py-4">
                    {m.is_active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-leaf-200 bg-leaf-50 px-3 py-1 text-xs font-semibold text-leaf-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-leaf-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        Hidden
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/medicines/${m.id}/edit`}
                        className="btn btn-outline px-3 py-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Link>
                      <DeleteMedicineButton id={m.id} name={m.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
