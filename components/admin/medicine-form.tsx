"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { AlertCircle, Check } from "lucide-react";
import { createMedicine, updateMedicine, type MedicineResult } from "@/app/admin/medicines/actions";
import { medicineImageUrl } from "@/lib/storage";
import type { Category, MedicineWithCategory } from "@/types/db";

/** Formats the image input accepts. The server action re-checks the same list. */
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
/** Vercel caps request bodies at about 4.5 MB, so images must stay under this. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Why a chosen image can't be uploaded, or null when it can (or none was chosen). */
function imageProblem(file: File | null | undefined): string | null {
  if (!file || file.size === 0) return null;
  // `accept` only filters the picker; drag-and-drop and "All files" get past it.
  if (!IMAGE_TYPES.includes(file.type)) return "Images must be PNG, JPEG or WebP.";
  if (file.size > MAX_IMAGE_BYTES) return "Images must be 4 MB or smaller.";
  return null;
}

export function MedicineForm({
  categories,
  medicine,
}: {
  categories: Category[];
  medicine?: MedicineWithCategory | null;
}) {
  const m = medicine ?? null;
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [picked, setPicked] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const currentImage = medicineImageUrl(m?.image_path);

  // Move focus to the error summary whenever a save fails.
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  // Revoke the local preview URL when it changes or the form unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onImageChange(file: File | undefined) {
    const problem = imageProblem(file);
    setImageError(problem);
    setPicked(Boolean(file));
    setPreview(file && !problem ? URL.createObjectURL(file) : null);
  }

  // Drop the chosen file, e.g. after picking one that is too large.
  function clearImage() {
    if (fileRef.current) fileRef.current.value = "";
    setImageError(null);
    setPicked(false);
    setPreview(null);
    fileRef.current?.focus();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    // Check the image before sending: an oversized body is rejected with a 413
    // before the action runs, so the server can't explain what went wrong.
    const image = fd.get("image");
    const problem = imageProblem(image instanceof File ? image : null);
    if (problem) {
      setImageError(problem);
      fileRef.current?.focus();
      return;
    }
    setSubmitting(true);
    let res: MedicineResult | undefined;
    try {
      res = m ? await updateMedicine(m.id, fd) : await createMedicine(fd);
    } catch (err) {
      // The success redirect arrives as a thrown error; let Next handle it.
      unstable_rethrow(err);
      // A 413 (body too large) or a dropped connection throws instead of returning.
      setError("The save failed. Check your connection and try again. Images must be under 4 MB.");
      setSubmitting(false);
      return;
    }
    // On success the action redirects to /admin/medicines; we only get a result
    // back on failure.
    if (res && !res.ok) {
      setError(res.error ?? "Could not save. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-4xl space-y-6" aria-busy={submitting || undefined}>
      {error && (
        <div ref={errorRef} tabIndex={-1} role="alert" className="error-summary">
          <p className="font-semibold">The medicine was not saved</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* ------------------------------------------------------ Basics */}
      <Section title="Basics" intro="How the product is named and filed in the catalogue.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={id("name")} label="Name" help="Brand or product name, e.g. Cenforce 100.">
            <input
              id={id("name")}
              name="name"
              required
              maxLength={200}
              autoComplete="off"
              defaultValue={m?.name ?? ""}
              className="input"
              aria-describedby={`${id("name")}-help`}
            />
          </Field>
          <Field id={id("molecule")} label="Molecule / salt" optional help="Active ingredient, e.g. Sildenafil Citrate.">
            <input
              id={id("molecule")}
              name="molecule"
              maxLength={200}
              autoComplete="off"
              defaultValue={m?.molecule ?? ""}
              className="input"
              aria-describedby={`${id("molecule")}-help`}
            />
          </Field>
          <Field id={id("category_id")} label="Category" optional>
            <select id={id("category_id")} name="category_id" defaultValue={m?.category_id ?? ""} className="select">
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id={id("form")} label="Dosage form" optional help="Tablet, Capsule, Injection…">
            <input
              id={id("form")}
              name="form"
              maxLength={80}
              autoComplete="off"
              defaultValue={m?.form ?? ""}
              className="input"
              aria-describedby={`${id("form")}-help`}
            />
          </Field>
        </div>
      </Section>

      {/* ---------------------------------------- Strengths & packaging */}
      <Section title="Strengths & packaging" intro="Shown as strength tags and spec rows on the product page.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field id={id("strengths")} label="Strengths" optional help="Comma-separated, e.g. 25 mg, 50 mg">
              <input
                id={id("strengths")}
                name="strengths"
                maxLength={300}
                autoComplete="off"
                defaultValue={m?.strengths ?? ""}
                className="input font-mono"
                aria-describedby={`${id("strengths")}-help`}
              />
            </Field>
          </div>
          <Field id={id("pack")} label="Pack" optional help="e.g. 10 x 10 blister">
            <input
              id={id("pack")}
              name="pack"
              maxLength={200}
              autoComplete="off"
              defaultValue={m?.pack ?? ""}
              className="input"
              aria-describedby={`${id("pack")}-help`}
            />
          </Field>
          <Field id={id("moq")} label="Minimum order (MOQ)" optional>
            <input id={id("moq")} name="moq" maxLength={100} autoComplete="off" defaultValue={m?.moq ?? ""} className="input" />
          </Field>
          <Field id={id("lead_time")} label="Lead time" optional>
            <input
              id={id("lead_time")}
              name="lead_time"
              maxLength={100}
              autoComplete="off"
              defaultValue={m?.lead_time ?? ""}
              className="input"
            />
          </Field>
        </div>
      </Section>

      {/* ------------------------------------ Availability & visibility */}
      <Section title="Availability & visibility" intro="Stock status buyers see, and whether the product is listed at all.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={id("availability")} label="Availability">
            <select
              id={id("availability")}
              name="availability"
              defaultValue={m?.availability ?? "in-stock"}
              className="select"
            >
              <option value="in-stock">In stock</option>
              <option value="made-to-order">Made to order</option>
            </select>
          </Field>
          <Field id={id("sort_order")} label="Sort order" help="Lower numbers appear first. 0 is the default.">
            <input
              id={id("sort_order")}
              name="sort_order"
              type="number"
              inputMode="numeric"
              min={0}
              max={100000}
              step={1}
              defaultValue={m?.sort_order ?? 0}
              className="input font-mono"
              aria-describedby={`${id("sort_order")}-help`}
            />
          </Field>
          <div className="sm:col-span-2">
            <label className="check">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={m?.is_active ?? true}
                aria-describedby={`${id("is_active")}-help`}
              />
              <span className="font-semibold text-fg-strong">Active: show on the public site</span>
            </label>
            <p id={`${id("is_active")}-help`} className="field-help">
              Untick to hide the product from the catalogue and search without deleting it.
            </p>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------- Image */}
      <Section title="Image" intro="PNG, JPEG or WebP. A plain, light background works best.">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {(preview || currentImage) && (
            <figure className="flex-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview ?? currentImage ?? ""}
                alt={preview ? "Preview of the new image" : `Current image of ${m?.name ?? "this medicine"}`}
                width={160}
                height={160}
                className="h-40 w-40 rounded border border-rule bg-paper object-contain p-2"
              />
              <figcaption className="meta mt-2">{preview ? "New image (saved on submit)" : "Current image"}</figcaption>
            </figure>
          )}
          <div className="min-w-0 flex-1">
            <Field
              id={id("image")}
              label={currentImage ? "Replace image" : "Upload image"}
              optional
              help={currentImage ? "Up to 4 MB. Leave empty to keep the current image." : "Up to 4 MB."}
              error={imageError}
            >
              <input
                ref={fileRef}
                id={id("image")}
                name="image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-invalid={imageError ? true : undefined}
                aria-describedby={[`${id("image")}-help`, imageError ? `${id("image")}-err` : null]
                  .filter(Boolean)
                  .join(" ")}
                onChange={(e) => onImageChange(e.target.files?.[0])}
                className="input cursor-pointer py-1.5 text-fg file:mr-4 file:min-h-[36px] file:cursor-pointer file:rounded-sm file:border file:border-solid file:border-navy-900 file:bg-white file:px-4 file:font-semibold file:text-navy-900 hover:file:bg-paper"
              />
            </Field>
            {picked && (
              <button type="button" onClick={clearImage} className="btn btn-ghost btn-sm mt-2 -ml-2.5">
                Clear selection
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------- Description */}
      <Section title="Description" intro="Copy shown on the product page.">
        <div className="space-y-5">
          <Field id={id("note")} label="Note" optional help="One short highlight, shown in a note box on the product page.">
            <input
              id={id("note")}
              name="note"
              maxLength={500}
              defaultValue={m?.note ?? ""}
              className="input"
              aria-describedby={`${id("note")}-help`}
            />
          </Field>
          <Field id={id("description")} label="Description" optional>
            <textarea
              id={id("description")}
              name="description"
              rows={6}
              maxLength={5000}
              defaultValue={m?.description ?? ""}
              className="textarea"
            />
          </Field>
        </div>
      </Section>

      {/* ------------------------------------------------ sticky actions */}
      <div className="bulk-bar">
        <p className="min-w-0 truncate font-medium">{m ? `Editing ${m.name}` : "New medicine"}</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/medicines" className="btn btn-outline-inverse btn-sm">
            Cancel
          </Link>
          <button type="submit" disabled={submitting} className="btn btn-inverse btn-sm">
            {submitting ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Saving…
              </>
            ) : (
              <>
                <Check aria-hidden="true" />
                {m ? "Save changes" : "Create medicine"}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

function Section({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  const hid = useId();
  return (
    <section className="panel" aria-labelledby={hid}>
      <h2 id={hid} className="text-h4 font-sans tracking-normal">
        {title}
      </h2>
      {intro && <p className="mt-1 text-fg-muted">{intro}</p>}
      <div className="mt-5 border-t border-rule pt-5">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  optional,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  help?: string;
  /** Inline error shown under the control; wire `${id}-err` into its aria-describedby. */
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {optional && <span className="opt">(optional)</span>}
      </label>
      {children}
      {help && (
        <p id={`${id}-help`} className="field-help">
          {help}
        </p>
      )}
      {error && (
        // role="alert": the error appears while focus is still on the control.
        <p id={`${id}-err`} role="alert" className="field-error">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none" strokeWidth={1.75} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
