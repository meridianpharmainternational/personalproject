"use client";

import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useForm, type FieldError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import { submitEnquiry, type EnquiryResult } from "@/lib/actions/enquiry";
import { toLines, type EnquiryItem } from "@/lib/enquiry-list";
import { COUNTRIES } from "@/lib/countries";

const BUYER_KEY = "meridian.buyer.v1";

// Max lengths match enquirySchema in lib/validations/enquiry.ts, so the server
// never rejects what this form accepted.
const detailsSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120, "Name is too long (120 characters max)."),
  email: z
    .string()
    .trim()
    .max(254, "Email address is too long.")
    .email("Enter a valid email address, like name@company.com."),
  country: z.string().trim().min(2, "Enter the country you import into.").max(80, "Country name is too long."),
  company: z.string().trim().max(120, "Company name is too long."),
  phone: z.string().trim().max(40, "Phone number is too long."),
  message: z.string().trim().max(3000, "Message is too long (3,000 characters max)."),
});
type Details = z.infer<typeof detailsSchema>;
const EMPTY: Details = { name: "", email: "", country: "", company: "", phone: "", message: "" };
const FIELD_ORDER: (keyof Details)[] = ["name", "email", "country", "company", "phone", "message"];
/** The fields "Remember my details" keeps on this device (never the message). */
const BUYER_FIELDS: (keyof Details)[] = ["name", "email", "country", "company", "phone"];

/**
 * Unsent details, kept in memory for this page visit only (never written to
 * storage). The drawer unmounts this form when it closes; this brings back
 * what the buyer typed when it opens again. Cleared after a successful send.
 */
let draft: Partial<Details> | null = null;

/** Copy only the string values of `keys` from untrusted input (storage, watch()). */
function pickText(v: unknown, keys: (keyof Details)[]): Partial<Details> {
  const out: Partial<Details> = {};
  if (!v || typeof v !== "object") return out;
  const src = v as Record<string, unknown>;
  for (const k of keys) {
    const s = src[k];
    if (typeof s === "string") out[k] = s;
  }
  return out;
}

/**
 * Step 2 of the enquiry list: buyer details. One submit sends every product.
 * Items travel as structured JSON and are formatted on the server.
 */
export function EnquiryDetailsForm({
  formId,
  items,
  onSent,
  onPendingChange,
}: {
  formId: string;
  items: EnquiryItem[];
  onSent: () => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const uid = useId();
  const pathname = usePathname();
  const summaryRef = useRef<HTMLDivElement>(null);
  // Honeypot: uncontrolled and not registered with react-hook-form.
  const hpRef = useRef<HTMLInputElement>(null);
  const [remember, setRemember] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    watch,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<Details>({
    resolver: zodResolver(detailsSchema),
    // The error summary takes focus instead of the first invalid field.
    shouldFocusError: false,
    defaultValues: EMPTY,
  });

  // Pre-fill on mount: details saved on this device (returning buyers), then
  // anything typed earlier in this visit, which wins. The draft is restored
  // even when nothing is saved on the device.
  useEffect(() => {
    let saved: Partial<Details> = {};
    try {
      const raw = window.localStorage.getItem(BUYER_KEY);
      if (raw) saved = pickText(JSON.parse(raw), BUYER_FIELDS);
    } catch {
      /* storage unavailable or unreadable: use the draft alone */
    }
    if (!draft && Object.keys(saved).length === 0) return;
    reset({ ...EMPTY, ...saved, ...draft });
  }, [reset]);

  // Keep the in-memory draft in step with every edit.
  useEffect(() => {
    const sub = watch((v) => {
      draft = pickText(v, FIELD_ORDER);
    });
    return () => sub.unsubscribe();
  }, [watch]);

  useEffect(() => {
    onPendingChange?.(isSubmitting);
  }, [isSubmitting, onPendingChange]);

  const focusSummary = () => requestAnimationFrame(() => summaryRef.current?.focus());

  const onValid = async (v: Details) => {
    setServerError(null);
    const fd = new FormData();
    (Object.keys(v) as (keyof Details)[]).forEach((k) => fd.set(k, v[k] ?? ""));
    fd.set("items", JSON.stringify(toLines(items)));
    fd.set("source", "Enquiry List");
    fd.set("page", pathname ?? "");
    fd.set("mp_extra_7", hpRef.current?.value ?? "");
    // A thrown action (network drop, stale action ID after a redeploy, 5xx/413)
    // must still surface a message; submitEnquiry never redirects.
    let res: EnquiryResult;
    try {
      res = await submitEnquiry(fd);
    } catch {
      res = {
        ok: false,
        error: "We couldn’t reach our server. Your list is still saved on this device. Please try again in a moment.",
      };
    }
    if (!res.ok) {
      setServerError(res.error ?? "Something went wrong. Please try again.");
      focusSummary();
      return;
    }
    try {
      if (remember) {
        const { name, email, country, company, phone } = v;
        window.localStorage.setItem(BUYER_KEY, JSON.stringify({ name, email, country, company, phone }));
      } else {
        window.localStorage.removeItem(BUYER_KEY);
      }
    } catch {
      /* ignore */
    }
    // Sent: the next list starts from the saved details only, not this message.
    draft = null;
    onSent();
  };

  const errList = FIELD_ORDER.filter((k) => errors[k]).map((k) => ({ k, msg: errors[k]?.message }));
  const showSummary = serverError || (submitCount > 0 && errList.length > 0);

  // Focus the field without a hash change (the catalogue's URL sync would copy it).
  const jumpTo = (k: keyof Details) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setFocus(k);
  };

  return (
    <form id={formId} noValidate onSubmit={handleSubmit(onValid, focusSummary)} className="space-y-5 pt-4">
      {showSummary && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="error-summary">
          <p className="font-semibold">
            {serverError ? "We couldn’t send your enquiry" : "Please check these details"}
          </p>
          {serverError ? (
            <p className="mt-1">{serverError}</p>
          ) : (
            <ul className="mt-1 list-disc pl-5">
              {errList.map((e) => (
                <li key={e.k}>
                  <a href={`#${uid}-${e.k}`} onClick={jumpTo(e.k)} className="inline-flex min-h-tap items-center underline">
                    {e.msg}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <details className="panel !p-4">
        {/* py-2.5 makes a 46px target (26px line + 20px); -my-2.5 keeps the panel's visual padding. */}
        <summary className="-my-2.5 cursor-pointer py-2.5 font-semibold text-fg-strong">
          {items.length} product{items.length === 1 ? "" : "s"} in this enquiry
        </summary>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
          {items.map((i) => (
            <li key={i.key}>
              {[i.name, i.strength].filter(Boolean).join(" ")} — {i.qty} pack{i.qty === 1 ? "" : "s"}
            </li>
          ))}
        </ol>
      </details>

      <Row id={`${uid}-name`} label="Your name" error={errors.name}>
        <input id={`${uid}-name`} className="input" autoComplete="name" {...aria(`${uid}-name`, errors.name)} {...register("name")} />
      </Row>
      <Row id={`${uid}-email`} label="Work email" error={errors.email}>
        <input id={`${uid}-email`} type="email" inputMode="email" className="input" autoComplete="email" {...aria(`${uid}-email`, errors.email)} {...register("email")} />
      </Row>
      <Row id={`${uid}-country`} label="Country" help="The market you are importing into." error={errors.country}>
        <input
          id={`${uid}-country`}
          className="input"
          list={`${uid}-countries`}
          autoComplete="country-name"
          {...aria(`${uid}-country`, errors.country, true)}
          {...register("country")}
        />
        <datalist id={`${uid}-countries`}>
          {COUNTRIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Row>
      <Row id={`${uid}-company`} label="Company" optional error={errors.company}>
        <input id={`${uid}-company`} className="input" autoComplete="organization" {...aria(`${uid}-company`, errors.company)} {...register("company")} />
      </Row>
      <Row id={`${uid}-phone`} label="Phone or WhatsApp" optional error={errors.phone}>
        <input id={`${uid}-phone`} type="tel" inputMode="tel" className="input" autoComplete="tel" {...aria(`${uid}-phone`, errors.phone)} {...register("phone")} />
      </Row>
      <Row id={`${uid}-message`} label="Message" optional help="Destination, licences held, delivery timing — anything that helps us quote." error={errors.message}>
        <textarea id={`${uid}-message`} className="textarea" rows={4} {...aria(`${uid}-message`, errors.message, true)} {...register("message")} />
      </Row>

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
    </form>
  );
}

function aria(id: string, err: FieldError | undefined, hasHelp = false) {
  const describedBy = [hasHelp ? `${id}-help` : null, err ? `${id}-err` : null].filter(Boolean).join(" ");
  return {
    "aria-invalid": err ? (true as const) : undefined,
    "aria-describedby": describedBy || undefined,
  };
}

function Row({
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
  error?: FieldError;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label} {optional && <span className="opt">(optional)</span>}
      </label>
      {children}
      {help && (
        <p className="field-help" id={`${id}-help`}>
          {help}
        </p>
      )}
      {error?.message && (
        <p className="field-error" id={`${id}-err`}>
          <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 flex-none" />
          {error.message}
        </p>
      )}
    </div>
  );
}
