"use client";

import { openEnquiry } from "@/components/enquiry/enquiry-modal";

/**
 * Opens the shared enquiry modal, optionally prefilled with a product. Safe to
 * render inside server components (it's a thin client button).
 */
export function EnquiryButton({
  product,
  message,
  className,
  label = "Enquire",
}: {
  product?: string;
  message?: string;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => openEnquiry({ product, message })}
      className={className ?? "btn btn-primary"}
    >
      {label}
    </button>
  );
}
