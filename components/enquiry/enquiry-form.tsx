"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check } from "lucide-react";
import { enquirySchema, type EnquiryInput } from "@/lib/validations/enquiry";
import { submitEnquiry, type EnquiryResult } from "@/lib/actions/enquiry";
import { COUNTRIES } from "@/lib/countries";
import { enquiryList, useEnquiryList } from "@/lib/enquiry-list";
import { Field } from "@/components/ui/field";

/** Same device-only store the enquiry-list drawer uses, so both forms pre-fill alike. */
const BUYER_KEY = "meridian.buyer.v1";

/** Mirrors the max lengths in lib/validations/enquiry.ts (which also owns every error message). */
const MAX = { name: 120, email: 254, phone: 40, country: 80, company: 120, product: 60000, message: 3000 } as const;

/** Field order for the error summary (matches the visual order). */
const ORDER: (keyof EnquiryInput)[] = ["name", "email", "company", "phone", "country", "product", "message"];

const fmt = (n: number) => n.toLocaleString("en");

/**
 * The single-enquiry form (contact page). Multi-product enquiries go through
 * the enquiry-list drawer; this form sends one message, optionally with a
 * free-text product list. It never sends the enquiry list, so while that list
 * holds products the form (and its success panel) says so and offers the
 * drawer, rather than letting a buyer think the list went too.
 *
 * Accessibility: ids are useId()-prefixed (no clashes if two forms are
 * mounted), every control is labelled, errors are linked with aria-invalid +
 * aria-describedby, a focused error summary appears after a failed submit or a
 * server error, and the success panel takes focus.
 */
export function EnquiryForm({
  source = "Contact Form",
  product,
  message,
  compact = false,
}: {
  source?: string;
  product?: string;
  /** Optional pre-filled message. */
  message?: string;
  compact?: boolean;
}) {
  const uid = `ef${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const id = (k: string) => `${uid}-${k}`;
  const pathname = usePathname();
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  // Honeypot: uncontrolled and not registered (the schema would strip it).
  const hpRef = useRef<HTMLInputElement>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  // Lines waiting in the enquiry-list drawer (empty on the server and until hydrated).
  const listed = useEnquiryList().items.length;
  const listedText = `${listed} product${listed === 1 ? "" : "s"}`;

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setFocus,
    watch,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<EnquiryInput>({
    resolver: zodResolver(enquirySchema),
    // The error summary takes focus instead of the first invalid field.
    shouldFocusError: false,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      country: "",
      company: "",
      product: product ?? "",
      message: message ?? "",
    },
  });

  // Returning buyers: pre-fill contact details saved on this device.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BUYER_KEY);
      if (!raw) return;
      const v = JSON.parse(raw) as Partial<Record<keyof EnquiryInput, string>>;
      const cur = getValues();
      reset({
        ...cur,
        name: cur.name || v.name || "",
        email: cur.email || v.email || "",
        country: cur.country || v.country || "",
        company: cur.company || v.company || "",
        phone: cur.phone || v.phone || "",
      });
    } catch {
      /* storage unavailable: start empty */
    }
  }, [reset, getValues]);

  // Move focus to the success panel once it renders.
  useEffect(() => {
    if (sentTo !== null) successRef.current?.focus();
  }, [sentTo]);

  const focusSummary = () => requestAnimationFrame(() => summaryRef.current?.focus());

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const fd = new FormData();
    (Object.keys(values) as (keyof EnquiryInput)[]).forEach((k) => fd.set(k, values[k] ?? ""));
    fd.set("source", source);
    fd.set("page", pathname ?? "");
    fd.set("mp_extra_7", hpRef.current?.value ?? "");
    // A thrown action (network drop, stale action ID after a redeploy, 5xx/413)
    // must still surface a message; submitEnquiry never redirects.
    let res: EnquiryResult;
    try {
      res = await submitEnquiry(fd);
    } catch {
      res = { ok: false, error: "We couldn’t reach our server. Please try again in a moment." };
    }
    if (!res.ok) {
      setServerError(res.error ?? "Something went wrong. Please try again.");
      focusSummary();
      return;
    }
    try {
      if (remember) {
        const { name, email, country, company, phone } = values;
        window.localStorage.setItem(BUYER_KEY, JSON.stringify({ name, email, country, company, phone }));
      } else {
        window.localStorage.removeItem(BUYER_KEY);
      }
    } catch {
      /* ignore */
    }
    setSentTo(values.email);
  }, focusSummary);

  const startAnother = () => {
    const keep = getValues();
    reset({ ...keep, product: product ?? "", message: "" });
    setServerError(null);
    setSentTo(null);
  };

  /* ------------------------------------------------------------ success */
  if (sentTo !== null) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        aria-labelledby={id("done-title")}
        aria-describedby={listed > 0 ? `${id("done-body")} ${id("done-list")}` : id("done-body")}
        className="panel focus-visible:outline-offset-4"
      >
        <span className="grid h-10 w-10 place-items-center rounded-sm bg-leaf-700 text-white" aria-hidden>
          <Check className="h-5 w-5" strokeWidth={2} />
        </span>
        <h3 id={id("done-title")} className="mt-4">
          Enquiry sent
        </h3>
        <p id={id("done-body")} className="mt-2">
          Thank you. Our export team replies by email{sentTo ? <> to <strong className="break-all">{sentTo}</strong></> : null},
          usually within 1 business day.
        </p>
        {listed > 0 && (
          <p id={id("done-list")} className="mt-3 text-fg-muted">
            Your enquiry list still has {listedText}. This message didn’t include them, so send the list as
            its own enquiry.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {listed > 0 && (
            <button type="button" className="btn btn-enquire" onClick={() => enquiryList.open()}>
              Review &amp; send your list
              <ArrowRight aria-hidden className="icon-trail" />
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={startAnother}>
            Send another enquiry
          </button>
          <Link href="/medicines" className="btn btn-ghost">
            Browse the catalogue
          </Link>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------- form */
  const messageErr = errors.message?.message;
  const errText = (k: keyof EnquiryInput) => (k === "message" ? messageErr : errors[k]?.message);
  const errList = ORDER.filter((k) => errors[k]).map((k) => ({ k, msg: errText(k) }));
  const showSummary = Boolean(serverError) || (submitCount > 0 && errList.length > 0);

  const jumpTo = (k: keyof EnquiryInput) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setFocus(k);
  };

  const messageLen = watch("message")?.length ?? 0;
  const productLen = watch("product")?.length ?? 0;

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={isSubmitting || undefined} className="space-y-5">
      {showSummary && (
        <div ref={summaryRef} tabIndex={-1} role="alert" aria-labelledby={id("sum-title")} className="error-summary">
          <p id={id("sum-title")} className="font-semibold">
            {serverError ? "We couldn’t send your enquiry" : "Please check the highlighted fields"}
          </p>
          {serverError ? (
            <p className="mt-1">{serverError}</p>
          ) : (
            <ul className="mt-1 list-disc pl-5">
              {errList.map((e) => (
                <li key={e.k}>
                  <a href={`#${id(e.k)}`} onClick={jumpTo(e.k)} className="inline-flex min-h-tap items-center underline">
                    {e.msg}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {listed > 0 && (
        // Secondary, not green: the enquiry bar (phones, tablets) and the aside's
        // "Open your enquiry list" (desktop) already carry the one green list action.
        <div className="rounded border border-rule bg-paper p-4">
          <p className="font-semibold text-fg-strong">You have {listedText} in your enquiry list</p>
          <p className="mt-1 text-fg-muted">
            This form doesn’t send them. Review your list and send it as one enquiry.
          </p>
          <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={() => enquiryList.open()}>
            Review &amp; send your list
            <ArrowRight aria-hidden className="icon-trail" />
          </button>
        </div>
      )}

      {product ? (
        <div className="rounded border border-rule bg-paper px-4 py-3">
          <span className="text-fg-muted">Enquiring about</span>{" "}
          <strong className="text-fg-strong">{product}</strong>
          <input type="hidden" {...register("product")} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor={id("name")} error={errors.name?.message}>
          {(a) => (
            <input {...a} className="input" autoComplete="name" maxLength={MAX.name} {...register("name")} />
          )}
        </Field>
        <Field label="Work email" htmlFor={id("email")} error={errors.email?.message}>
          {(a) => (
            <input
              {...a}
              type="email"
              inputMode="email"
              className="input"
              autoComplete="email"
              maxLength={MAX.email}
              {...register("email")}
            />
          )}
        </Field>
        <Field label="Company" optional htmlFor={id("company")} error={errors.company?.message}>
          {(a) => (
            <input {...a} className="input" autoComplete="organization" maxLength={MAX.company} {...register("company")} />
          )}
        </Field>
        <Field label="Phone or WhatsApp" optional htmlFor={id("phone")} error={errors.phone?.message}>
          {(a) => (
            <input
              {...a}
              type="tel"
              inputMode="tel"
              className="input"
              autoComplete="tel"
              maxLength={MAX.phone}
              {...register("phone")}
            />
          )}
        </Field>
        <Field
          label="Country"
          optional
          htmlFor={id("country")}
          hint="The market you are importing into."
          error={errors.country?.message}
        >
          {(a) => (
            <>
              <input
                {...a}
                className="input"
                list={id("countries")}
                autoComplete="country-name"
                maxLength={MAX.country}
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
      </div>

      {!product && (
        <Field
          label="Products you need"
          optional
          htmlFor={id("product")}
          hint={
            <>
              One per line: brand or molecule, strength and quantity if you know them.{" "}
              <span className="whitespace-nowrap font-mono text-xs">
                {fmt(productLen)} / {fmt(MAX.product)}
              </span>
            </>
          }
          error={errors.product?.message}
        >
          {(a) => (
            <textarea
              {...a}
              className="textarea"
              rows={compact ? 2 : 3}
              maxLength={MAX.product}
              placeholder={"e.g. Sildenafil Citrate 100 mg, 50 packs"}
              {...register("product")}
            />
          )}
        </Field>
      )}

      <Field
        label="Message"
        optional={Boolean(product)}
        htmlFor={id("message")}
        hint={
          <>
            {product
              ? "Quantities, destination market, documentation needs."
              : "Quantities, destination market, documentation needs. Needed if you haven’t listed products."}{" "}
            <span className="whitespace-nowrap font-mono text-xs">
              {fmt(messageLen)} / {fmt(MAX.message)}
            </span>
          </>
        }
        error={messageErr}
      >
        {(a) => (
          <textarea {...a} className="textarea" rows={compact ? 3 : 5} maxLength={MAX.message} {...register("message")} />
        )}
      </Field>

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

      <label className="check">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        Remember my details on this device
      </label>

      <div className="flex flex-col items-start gap-3 pt-1">
        <button type="submit" disabled={isSubmitting} className="btn btn-enquire btn-lg w-full sm:w-auto">
          {isSubmitting ? (
            <>
              <span className="spinner" aria-hidden />
              Sending…
            </>
          ) : (
            "Send enquiry"
          )}
        </button>
        <p className="text-sm text-fg-muted">
          We use these details only to reply to your enquiry. See our{" "}
          <Link href="/privacy" className="inline-flex min-h-tap items-center text-navy-600 underline">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
