"use client";

import { ArrowRight } from "lucide-react";
import { enquiryList, useEnquiryList } from "@/lib/enquiry-list";
import { openPasteList } from "@/components/enquiry/enquiry-drawer";

/**
 * Opens the enquiry list drawer from anywhere (footer, "How enquiry works",
 * CTA panels). `paste` opens it with the "Paste a list" box expanded.
 */
export function OpenEnquiryButton({
  className = "btn btn-enquire",
  label = "Open your enquiry list",
  showCount = true,
  paste = false,
}: {
  className?: string;
  label?: string;
  showCount?: boolean;
  paste?: boolean;
}) {
  const { items } = useEnquiryList();
  const n = items.length;
  return (
    <button type="button" className={className} onClick={() => (paste ? openPasteList() : enquiryList.open())}>
      {label}
      {showCount && n > 0 ? ` (${n})` : ""}
      <ArrowRight aria-hidden className="icon-trail" />
    </button>
  );
}
