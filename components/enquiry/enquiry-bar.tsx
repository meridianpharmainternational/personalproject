"use client";

import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { enquiryList, useEnquiryList } from "@/lib/enquiry-list";

/** Mobile/tablet (<1024px) bottom bar: "3 products in your list · Review & send". */
export function EnquiryBar() {
  const { items, open } = useEnquiryList();
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/admin") || pathname.startsWith("/login")) return null;

  const n = items.length;
  const visible = n > 0 && !open;
  return (
    <div className={`enq-bar${visible ? " is-visible" : ""}`}>
      <span>
        <b>
          {n} product{n === 1 ? "" : "s"}
        </b>{" "}
        in your list
      </span>
      <button
        type="button"
        className="btn btn-enquire btn-sm"
        onClick={() => enquiryList.open()}
        tabIndex={visible ? 0 : -1}
      >
        Review &amp; send <ArrowRight aria-hidden className="icon-trail" />
      </button>
    </div>
  );
}
