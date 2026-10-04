"use client";

import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { enquiryList, useEnquiryList } from "@/lib/enquiry-list";

/** Phone (<640px) bottom bar: "3 products in your list · View list". Hidden while a toast shows (globals.css). */
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
        View list <ArrowRight aria-hidden className="icon-trail" />
      </button>
    </div>
  );
}
