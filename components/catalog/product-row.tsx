"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEnquiryList } from "@/lib/enquiry-list";
import { AddToEnquiry } from "@/components/enquiry/add-to-enquiry";
import type { CatalogItem } from "@/lib/catalog";
import { keepTogether } from "@/lib/format";
import { orderStrengths } from "@/components/catalog/catalog-model";

/**
 * Dense list row (mobile default view): 64px thumb, name + "molecule · form ·
 * strengths" (clamped to two lines; the 64px thumb still sets the row height),
 * 44px Add icon button. About 6 products fit on a phone screen.
 * Render inside a <ul>/<ol>.
 */
export function ProductRow({
  item,
  isNew = false,
  index = 0,
  emph,
}: {
  item: CatalogItem;
  isNew?: boolean;
  index?: number;
  /**
   * Strengths to surface first (see strengthEmphasis in catalog-model), so the
   * matched strength shows before the list is cut to three. Omitted (home rail,
   * related products): stored order.
   */
  emph?: ReadonlySet<string>;
}) {
  const { items } = useEnquiryList();
  const inList = items.some((i) => i.medicineId === item.id);
  const abbr = (item.form ?? "PRD").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "PRD";

  return (
    <li
      className={`prow${inList ? " is-added" : ""}${isNew ? " is-new" : ""}`}
      style={isNew ? ({ "--i": Math.min(index, 11) } as CSSProperties) : undefined}
    >
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="prow-thumb" src={item.image} alt="" loading="lazy" decoding="async" width={64} height={64} />
      ) : (
        <span className="prow-thumb-ph" aria-hidden="true">
          {abbr}
        </span>
      )}
      <div className="min-w-0">
        <p className="prow-title">
          <Link href={`/medicines/${item.id}`}>{item.name}</Link>
        </p>
        <p className="prow-sub line-clamp-2">
          {[item.molecule, item.form, orderStrengths(item.strengths, emph).slice(0, 3).map(keepTogether).join(", ")]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <AddToEnquiry product={item} variant="icon" />
    </li>
  );
}
