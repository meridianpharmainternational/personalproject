"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, Check } from "lucide-react";
import { createMedicine, updateMedicine } from "@/app/admin/medicines/actions";
import type { Category, MedicineWithCategory } from "@/types/db";

export function MedicineForm({
  categories,
  medicine,
}: {
  categories: Category[];
  medicine?: MedicineWithCategory | null;
}) {
  const m = medicine ?? null;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const res = m ? await updateMedicine(m.id, fd) : await createMedicine(fd);
    // On success the action redirects to /admin/medicines; we only get a result
    // back on failure.
    if (res && !res.ok) {
      setError(res.error ?? "Could not save. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <p className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {/* --- Product details --- */}
      <section className="card reveal p-6 sm:p-8">
        <h3 className="font-display text-lg font-bold text-brand-900">
          Product <span className="gradient-text">details</span>
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Core catalog information shown to buyers.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Name *" htmlFor="name">
            <input id="name" name="name" required defaultValue={m?.name ?? ""} className="input" />
          </Field>
          <Field label="Molecule / salt" htmlFor="molecule">
            <input id="molecule" name="molecule" defaultValue={m?.molecule ?? ""} className="input" />
          </Field>
          <Field label="Category" htmlFor="category_id">
            <select
              id="category_id"
              name="category_id"
              defaultValue={m?.category_id ?? ""}
              className="input"
            >
              <option value="">— none —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Form" htmlFor="form">
            <input id="form" name="form" defaultValue={m?.form ?? ""} placeholder="Tablet, Capsule, Injection…" className="input" />
          </Field>
          <Field label="Strengths (comma-separated)" htmlFor="strengths">
            <input id="strengths" name="strengths" defaultValue={m?.strengths ?? ""} placeholder="50 mg, 100 mg" className="input" />
          </Field>
          <Field label="Pack" htmlFor="pack">
            <input id="pack" name="pack" defaultValue={m?.pack ?? ""} placeholder="10 x 10 blister" className="input" />
          </Field>
          <Field label="MOQ" htmlFor="moq">
            <input id="moq" name="moq" defaultValue={m?.moq ?? ""} className="input" />
          </Field>
          <Field label="Lead time" htmlFor="lead_time">
            <input id="lead_time" name="lead_time" defaultValue={m?.lead_time ?? ""} className="input" />
          </Field>
          <Field label="Availability" htmlFor="availability">
            <select id="availability" name="availability" defaultValue={m?.availability ?? "in-stock"} className="input">
              <option value="in-stock">In stock</option>
              <option value="made-to-order">Made to order</option>
            </select>
          </Field>
          <Field label="Sort order" htmlFor="sort_order">
            <input id="sort_order" name="sort_order" type="number" min={0} defaultValue={m?.sort_order ?? 0} className="input" />
          </Field>
        </div>
      </section>

      {/* --- Description & media --- */}
      <section className="card reveal reveal-d1 p-6 sm:p-8">
        <h3 className="font-display text-lg font-bold text-brand-900">
          Description &amp; <span className="gradient-text">media</span>
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Highlights, copy, product image, and visibility.
        </p>
        <div className="mt-6 space-y-5">
          <Field label="Note (short highlight)" htmlFor="note">
            <input id="note" name="note" defaultValue={m?.note ?? ""} className="input" />
          </Field>

          <Field label="Description" htmlFor="description">
            <textarea id="description" name="description" rows={4} defaultValue={m?.description ?? ""} className="input" />
          </Field>

          <Field
            label={`Image${m?.image_path ? " (upload to replace)" : ""}`}
            htmlFor="image"
          >
            <input
              id="image"
              name="image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="block w-full rounded-xl border border-brand-100 bg-brand-50/40 p-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
            />
          </Field>
          {m?.image_path && (
            <p className="-mt-3 text-xs text-slate-500">
              Current image: {m.image_path}. Leave the file empty to keep it.
            </p>
          )}

          <label className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/40 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={m?.is_active ?? true}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            />
            <span>
              <span className="font-semibold text-brand-900">Active</span>
              <span className="block text-xs text-slate-500">
                Visible on the public site.
              </span>
            </span>
          </label>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={submitting} className="btn btn-primary px-5 py-3">
          {submitting ? (
            "Saving…"
          ) : (
            <>
              <Check className="h-4 w-4" />
              {m ? "Save changes" : "Create medicine"}
            </>
          )}
        </button>
        <Link href="/admin/medicines" className="btn btn-outline px-5 py-3">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
    </div>
  );
}
