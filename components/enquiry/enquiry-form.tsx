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
const MAX = { name: 120, email: 254, phone: 40, country: 80, company: 120, message: 3000 } as const;

/** Field order for the error summary (matches the visual order). */
const ORDER: (keyof EnquiryInput)[] = ["name", "email", "country", "company", "phone", "message"];

const fmt = (n: number) => n.toLocaleString("en");
/** A character counter appears only once a field is 80% full, so an empty form stays quiet. */
const nearLimit = (len: number, max: number) => len >= max * 0.8;

/**
 * The contact form: contact details and one message (products, quantities and
 * market go in the message). Multi-product enquiries go through the
 * enquiry-list drawer. This form never sends that list, so while it holds
 * products the form (and its success panel) says so and offers the drawer,
 * rather than letting a buyer think the list went too.
 *
 * Accessibility: ids are useId()-prefixed (no clashes if two forms are
 * mounted), every control is labelled, errors are linked with aria-invalid +
 * aria-describedby, a focused error summary appears after a failed submit or a
 * server error, and the success panel takes focus.
 */
export function EnquiryForm({
  source = "Contact Form",
  message,
}: {
  source?: string;
  /** Optional pre-filled message. */
  message?: string;
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
      // Not a field here: the schema's free-text product list stays empty.
      product: "",
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
    reset({ ...keep, message: "" });
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
          Thank you. Our export team replies by email
          {sentTo ? (
            <>
              {" "}
              to <strong className="break-all">{sentTo}</strong>
            </>
          ) : null}
          , usually within 1 business day.
        </p>
        {listed > 0 && (
          <p id={id("done-list")} className="mt-3 text-fg-muted">
            Your enquiry list still has {listedText}. This message didn’t include {listed === 1 ? "it" : "them"}, so
            send the list as its own enquiry.
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
  const errList = ORDER.filter((k) => errors[k]).map((k) => ({ k, msg: errors[k]?.message }));
  const showSummary = Boolean(serverError) || (submitCount > 0 && errList.length > 0);

  const jumpTo = (k: keyof EnquiryInput) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setFocus(k);
  };

  const messageLen = watch("message")?.length ?? 0;

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

      {listed > 0 && (
        <p className="text-fg-muted">
          Your enquiry list has {listedText}. This form doesn’t send {listed === 1 ? "it" : "them"}.{" "}
          <button type="button" className="link-inline" onClick={() => enquiryList.open()}>
            Review your list
          </button>
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor={id("name")} error={errors.name?.message}>
          {(a) => <input {...a} className="input" autoComplete="name" maxLength={MAX.name} {...register("name")} />}
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
        <Field label="Company" optional htmlFor={id("company")} error={errors.company?.message}>
          {(a) => (
            <input
              {...a}
              className="input"
              autoComplete="organization"
              maxLength={MAX.company}
              {...register("company")}
            />
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
      </div>

      <Field
        label="Message"
        htmlFor={id("message")}
        hint={
          <>
            The products, strengths and quantities you need, and any documents.
            {nearLimit(messageLen, MAX.message) && (
              <span className="whitespace-nowrap font-mono text-xs">
                {" "}
                {fmt(messageLen)} / {fmt(MAX.message)}
              </span>
            )}
          </>
        }
        error={errors.message?.message}
      >
        {(a) => <textarea {...a} className="textarea" rows={5} maxLength={MAX.message} {...register("message")} />}
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
