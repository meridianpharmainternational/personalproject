"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEnquiryList } from "@/lib/enquiry-list";
import { AddToEnquiry } from "@/components/enquiry/add-to-enquiry";
import type { CatalogItem } from "@/lib/catalog";
import { emphStrength, strengthLine } from "@/components/catalog/catalog-model";
import { moleculeLabel } from "@/lib/format";

/** Strengths named before the "+N more" remainder (spec §6: at most 3, then +N). */
const MAX_STRENGTHS = 3;

/**
 * Dense list row (mobile default view): 64px thumb, then the name over two
 * one-line subs, "molecule · form" and "strengths +N more" (each truncated, so
 * the strengths always keep their own line; the 64px thumb still sets the row
 * height), then the 44px Add icon button. About 6 products fit on a phone
 * screen. Render inside a <ul>/<ol>.
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
   * matched strength shows before the list is cut to three, and a single matched
   * strength is what Add puts on the enquiry line (not Any). Omitted (home rail,
   * related products): stored order, default strength.
   */
  emph?: ReadonlySet<string>;
}) {
  const { items } = useEnquiryList();
  const inList = items.some((i) => i.medicineId === item.id);
  const abbr = (item.form ?? "PRD").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "PRD";
  const meta = [moleculeLabel(item.molecule, item.ester), item.form].filter(Boolean).join(" · ");
  const { shown, more } = strengthLine(item.strengths, emph, MAX_STRENGTHS);

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
        {meta && <p className="prow-sub truncate">{meta}</p>}
        {shown && (
          // The remainder never shrinks, so a long first strength is what gets the
          // ellipsis and "+N more" stays readable even at 320px. Its spaces are
          // no-break spaces: a plain leading space would collapse in the flex item.
          <p className="prow-sub flex min-w-0">
            <span className="truncate">{shown}</span>
            {more > 0 && <span className="shrink-0 whitespace-nowrap">{` +${more} more`}</span>}
          </p>
        )}
      </div>
      <AddToEnquiry product={item} strength={emphStrength(item.strengths, emph)} variant="icon" />
    </li>
  );
}
