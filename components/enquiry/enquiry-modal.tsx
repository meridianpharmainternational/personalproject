"use client";

import { useEffect, useRef, useState } from "react";
import { EnquiryForm } from "@/components/enquiry/enquiry-form";
import { whatsappLink } from "@/lib/site";

type Prefill = { product?: string; message?: string };

// Module-level opener so ANY component (even server components, via the client
// EnquiryButton) can open the single shared modal without navigating.
let externalOpen: ((p?: Prefill) => void) | null = null;
export function openEnquiry(prefill?: Prefill) {
  externalOpen?.(prefill);
}

export function EnquiryModal() {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<Prefill>({});
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    externalOpen = (p) => {
      restoreRef.current = document.activeElement as HTMLElement | null;
      setPrefill(p ?? {});
      setOpen(true);
    };
    return () => {
      externalOpen = null;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        restoreRef.current?.focus?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    restoreRef.current?.focus?.();
  };

  const wa = whatsappLink(
    prefill.product
      ? `Hello Meridian, I'd like to enquire about ${prefill.product}.`
      : "Hello Meridian, I'd like to make an enquiry.",
  );

  return (
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-label="Send an enquiry"
    >
      <div className="modal-backdrop" onClick={close} aria-hidden="true" />
      <div className="absolute inset-0 flex items-end justify-center sm:items-center sm:p-4">
        <div className="modal-card pointer-events-auto">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-brand-900">
                {prefill.product
                  ? "Enquire about this medicine"
                  : "Send an enquiry"}
              </h2>
              {prefill.product && (
                <span className="chip mt-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-leaf-500" />
                  {prefill.product}
                </span>
              )}
            </div>
            <button
              onClick={close}
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              &times;
            </button>
          </div>

          <EnquiryForm source="Product Enquiry" product={prefill.product} compact />

          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-accent mt-3 w-full"
            >
              Chat on WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
