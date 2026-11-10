"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check, ImagePlus, Star } from "lucide-react";
import { submitReview, type ReviewResult } from "@/lib/actions/review";
import {
  REVIEW_LIMITS,
  reviewSchema,
  tidyComment,
  type ReviewInput,
  type ReviewValues,
} from "@/lib/validations/review";
import { COUNTRIES } from "@/lib/countries";
import { Field } from "@/components/ui/field";

const RATING_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"] as const;

/** Field order for the error summary (matches the visual order). */
const ORDER: (keyof ReviewInput)[] = ["rating", "name", "company", "country", "email", "comment", "consent"];

/** Photos are shrunk in the browser to this many pixels on the long side before upload. */
const PHOTO_EDGE = 512;
/** Larger originals are refused before decoding (phones can produce 20 MB+ files). */
const PHOTO_MAX_ORIGINAL = 15 * 1024 * 1024;

/** A JPEG of the photo at most PHOTO_EDGE px on its long side, on white (PNG transparency included). */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85),
  );
}

/**
 * The review form on /reviews: a star rating, who you are, a short review and
 * an optional photo. Reviews go to the admin first (submitReview stores them as
 * pending) and are published only once approved, which the success panel says.
 * Accessibility follows the contact form: labelled controls, linked errors, a
 * focused error summary after a failed submit and a focused success panel.
 */
export function ReviewForm() {
  const uid = `rf${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const id = (k: string) => `${uid}-${k}`;
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const hpRef = useRef<HTMLInputElement>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [hover, setHover] = useState(0);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    watch,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<ReviewInput, unknown, ReviewValues>({
    resolver: zodResolver(reviewSchema),
    shouldFocusError: false,
    defaultValues: {
      rating: "" as unknown as number,
      name: "",
      company: "",
      country: "",
      email: "",
      comment: "",
      consent: false as unknown as true,
    },
  });

  const rating = Number(watch("rating")) || 0;
  const commentLen = tidyComment(String(watch("comment") ?? "")).length;
  const shown = hover || rating;

  // The object URL of the preview is released when it changes or the form unmounts.
  useEffect(() => () => (photo ? URL.revokeObjectURL(photo.url) : undefined), [photo]);
  useEffect(() => {
    if (sent) successRef.current?.focus();
  }, [sent]);

  const focusSummary = () => requestAnimationFrame(() => summaryRef.current?.focus());

  const pickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setPhotoError("Please choose a JPG, PNG or WebP photo.");
      return;
    }
    if (file.size > PHOTO_MAX_ORIGINAL) {
      setPhotoError("That photo is too large. Please choose one under 15 MB.");
      return;
    }
    setPhotoBusy(true);
    try {
      const blob = await shrink(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setPhotoError("We couldn’t read that photo. Please try another one.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const fd = new FormData();
    fd.set("rating", String(values.rating));
    fd.set("name", values.name);
    fd.set("company", values.company);
    fd.set("country", values.country);
    fd.set("email", values.email);
    fd.set("comment", values.comment);
    fd.set("consent", values.consent ? "yes" : "");
    fd.set("mp_extra_7", hpRef.current?.value ?? "");
    if (photo) fd.set("photo", new File([photo.blob], "photo.jpg", { type: "image/jpeg" }));
    let res: ReviewResult;
    try {
      res = await submitReview(fd);
    } catch {
      res = { ok: false, error: "We couldn’t reach our server. Please try again in a moment." };
    }
    if (!res.ok) {
      setServerError(res.error ?? "Something went wrong. Please try again.");
      focusSummary();
      return;
    }
    setSent(true);
  }, focusSummary);

  const startAnother = () => {
    reset();
    setPhoto(null);
    setPhotoError(null);
    setServerError(null);
    setSent(false);
  };

  if (sent) {
    return (
      <div ref={successRef} tabIndex={-1} role="status" aria-labelledby={id("done")} className="panel">
        <span className="grid h-10 w-10 place-items-center rounded-sm bg-navy-900 text-white" aria-hidden>
          <Check className="h-5 w-5" strokeWidth={2} />
        </span>
        <h3 id={id("done")} className="mt-4">
          Thank you for your review
        </h3>
        <p className="mt-2">
          Our team checks every review before it is published, usually within two business days. Once approved, it
          appears on this page and on our home page.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/medicines" className="btn btn-primary">
            Browse the catalogue
          </Link>
          <button type="button" className="btn btn-ghost" onClick={startAnother}>
            Write another review
          </button>
        </div>
      </div>
    );
  }

  const errList = ORDER.flatMap((k) => (errors[k]?.message ? [{ k, msg: String(errors[k]?.message) }] : []));
  const showSummary = Boolean(serverError) || (submitCount > 0 && errList.length > 0);
  const jumpTo = (k: keyof ReviewInput) => (e: MouseEvent) => {
    e.preventDefault();
    if (k === "rating") document.getElementById(id("rating-1"))?.focus();
    else setFocus(k);
  };

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={isSubmitting || undefined} className="space-y-6">
      {showSummary && (
        <div ref={summaryRef} tabIndex={-1} role="alert" aria-labelledby={id("sum")} className="error-summary">
          <p id={id("sum")} className="font-semibold">
            {serverError ? "We couldn’t send your review" : "Please check the highlighted fields"}
          </p>
          {serverError ? (
            <p className="mt-1">{serverError}</p>
          ) : (
            <ul className="mt-1 list-disc pl-5">
              {errList.map((e) => (
                <li key={e.k}>
                  <a
                    href={`#${id(e.k)}`}
                    onClick={jumpTo(e.k)}
                    className="inline-flex min-h-tap items-center underline"
                  >
                    {e.msg}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <fieldset aria-describedby={errors.rating ? id("rating-err") : undefined}>
        <legend className="label">Your rating</legend>
        <div className="flex flex-wrap items-center gap-x-3" onMouseLeave={() => setHover(0)}>
          <div className="rv-rate">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="rv-rate-star" onMouseEnter={() => setHover(n)}>
                <input
                  type="radio"
                  value={String(n)}
                  id={id(`rating-${n}`)}
                  className="sr-only"
                  {...register("rating")}
                />
                <Star aria-hidden className={n <= shown ? "is-on" : undefined} fill="currentColor" strokeWidth={0} />
                <span className="sr-only">
                  {n} {n === 1 ? "star" : "stars"}, {RATING_WORDS[n]}
                </span>
              </label>
            ))}
          </div>
          <span className="text-fg-muted" aria-hidden="true">
            {shown ? RATING_WORDS[shown] : "Choose 1 to 5 stars"}
          </span>
        </div>
        {errors.rating?.message && (
          <p id={id("rating-err")} className="field-error">
            <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 flex-none" strokeWidth={1.75} />
            <span>{errors.rating.message}</span>
          </p>
        )}
      </fieldset>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor={id("name")} error={errors.name?.message}>
          {(a) => (
            <input {...a} className="input" autoComplete="name" maxLength={REVIEW_LIMITS.name} {...register("name")} />
          )}
        </Field>
        <Field label="Company" optional htmlFor={id("company")} error={errors.company?.message}>
          {(a) => (
            <input
              {...a}
              className="input"
              autoComplete="organization"
              maxLength={REVIEW_LIMITS.company}
              {...register("company")}
            />
          )}
        </Field>
        <Field label="Country" optional htmlFor={id("country")} error={errors.country?.message}>
          {(a) => (
            <>
              <input
                {...a}
                className="input"
                list={id("countries")}
                autoComplete="country-name"
                maxLength={REVIEW_LIMITS.country}
                {...register("country")}
              />
              <datalist id={id("countries")}>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field
          label="Email"
          optional
          htmlFor={id("email")}
          hint="Never published. Only used if we need to confirm your review."
          error={errors.email?.message}
        >
          {(a) => (
            <input
              {...a}
              type="email"
              inputMode="email"
              className="input"
              autoComplete="email"
              maxLength={REVIEW_LIMITS.email}
              {...register("email")}
            />
          )}
        </Field>
      </div>

      <Field
        label="Your review"
        htmlFor={id("comment")}
        hint={
          <span className="flex flex-wrap justify-between gap-x-4">
            <span>A few sentences about the products, documents or delivery.</span>
            <span className={`font-mono text-xs ${commentLen > REVIEW_LIMITS.comment ? "text-danger" : ""}`}>
              {commentLen} / {REVIEW_LIMITS.comment}
            </span>
          </span>
        }
        error={errors.comment?.message}
      >
        {(a) => (
          <textarea
            {...a}
            className="textarea"
            rows={4}
            maxLength={REVIEW_LIMITS.comment + 40}
            {...register("comment")}
          />
        )}
      </Field>

      <div>
        <p className="label" id={id("photo-label")}>
          Photo <span className="opt">(optional)</span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local object URL preview
            <img src={photo.url} alt="Your photo" width={56} height={56} className="rv-avatar rv-avatar-lg" />
          ) : (
            <span className="rv-avatar rv-avatar-lg" aria-hidden="true">
              <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
            </span>
          )}
          <label className="btn btn-secondary btn-sm rv-file">
            {photoBusy ? <span className="spinner" aria-hidden /> : null}
            {photo ? "Change photo" : "Add a photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-labelledby={id("photo-label")}
              aria-describedby={`${id("photo-help")}${photoError ? ` ${id("photo-err")}` : ""}`}
              onChange={pickPhoto}
              disabled={photoBusy}
            />
          </label>
          {photo && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPhoto(null)}>
              Remove
            </button>
          )}
        </div>
        <p id={id("photo-help")} className="field-help">
          Your photo or company logo, shown small and round beside your review. JPG, PNG or WebP.
        </p>
        {photoError && (
          <p id={id("photo-err")} className="field-error">
            <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 flex-none" strokeWidth={1.75} />
            <span>{photoError}</span>
          </p>
        )}
      </div>

      {/* Honeypot: people never see or reach it; form-filling bots fill it in. */}
      <div aria-hidden="true" className="sr-only">
        <label>
          Leave this field empty
          <input
            type="text"
            name="mp_extra_7"
            tabIndex={-1}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
            defaultValue=""
            ref={hpRef}
          />
        </label>
      </div>

      <div>
        <label className="check items-start py-2.5">
          <input
            type="checkbox"
            id={id("consent")}
            className="mt-0.5"
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? id("consent-err") : undefined}
            {...register("consent")}
          />
          <span>
            I agree that my name, company, country, rating, review and photo may be published on this website.
          </span>
        </label>
        {errors.consent?.message && (
          <p id={id("consent-err")} className="field-error">
            <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 flex-none" strokeWidth={1.75} />
            <span>{errors.consent.message}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col items-start gap-3">
        <button type="submit" disabled={isSubmitting || photoBusy} className="btn btn-primary btn-lg w-full sm:w-auto">
          {isSubmitting ? (
            <>
              <span className="spinner" aria-hidden />
              Sending…
            </>
          ) : (
            "Submit review"
          )}
        </button>
        <p className="text-sm text-fg-muted">
          Reviews are published after our team checks them. See our{" "}
          <Link href="/privacy" className="inline-flex min-h-tap items-center text-navy-600 underline">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
