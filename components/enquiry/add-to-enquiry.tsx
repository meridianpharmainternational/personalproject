"use client";

import { useEffect, useState } from "react";
import { Check, ListPlus, Plus } from "lucide-react";
import { enquiryList, useEnquiryList } from "@/lib/enquiry-list";
import { removeMedicineWithUndo, toAddInput, type ProductLike } from "@/lib/enquiry-actions";

/**
 * Screen-reader / toast name that tells same-named products apart
 * ("IVERHEAL, Tablets" vs "IVERHEAL, Cream"; "BOLDENAN, Injection, 250 mg/ml").
 * The single strength is included only when there is exactly one, since that
 * is what distinguishes otherwise identical name + form pairs.
 */
export function productLabel(p: Pick<ProductLike, "name" | "form" | "strengths">): string {
  return [p.name, p.form, p.strengths.length === 1 ? p.strengths[0] : null].filter(Boolean).join(", ");
}

/**
 * The single "Add to enquiry" control used everywhere (cards, rows, search
 * results, table). One tap adds; tapping again removes (with Undo in the
 * toast). It never moves the user's scroll position.
 *
 * - variant="button": green `btn-enquire` with label ("Add to enquiry" /
 *   "In enquiry list"). While in the list, its accessible name also states
 *   the action ("… Press to remove.") so pressing it is never a surprise.
 * - variant="icon": 44px icon button for dense rows and search results.
 */
export function AddToEnquiry({
  product,
  variant = "button",
  size = "sm",
  className = "",
}: {
  product: ProductLike;
  variant?: "button" | "icon";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { items } = useEnquiryList();
  const inList = items.some((i) => i.medicineId === product.id);
  const [justAdded, setJustAdded] = useState(false);
  const label = productLabel(product);

  useEffect(() => {
    if (!justAdded) return;
    const t = window.setTimeout(() => setJustAdded(false), 400);
    return () => window.clearTimeout(t);
  }, [justAdded]);

  const toggle = () => {
    if (inList) {
      // The toast's Undo is hard to reach by keyboard before it auto-dismisses,
      // so tell screen-reader users how to recover from this control instead.
      removeMedicineWithUndo(product.id, label, {
        announceMsg: `${label} removed from your enquiry list. Press the button again to add it back.`,
      });
    } else {
      enquiryList.add(toAddInput(product));
      setJustAdded(true);
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        className={`icon-btn${inList ? " is-added" : ""} ${className}`}
        aria-label={
          inList
            ? `${label} is in your enquiry list. Remove it`
            : `Add ${label} to enquiry list`
        }
      >
        {inList ? <Check aria-hidden /> : <ListPlus aria-hidden />}
      </button>
    );
  }

  const sizeCls = size === "lg" ? " btn-lg" : size === "sm" ? " btn-sm" : "";
  return (
    <button
      type="button"
      onClick={toggle}
      className={`btn btn-enquire${sizeCls}${inList ? " is-added" : ""}${justAdded ? " is-just-added" : ""} ${className}`}
    >
      {inList ? <Check aria-hidden /> : <Plus aria-hidden />}
      <span>
        {inList ? (
          "In enquiry list"
        ) : (
          <>
            Add<span className="btn-label-long"> to enquiry</span>
          </>
        )}
      </span>
      {inList ? (
        <span className="sr-only"> — {label}. Press to remove.</span>
      ) : (
        <span className="sr-only"> — {label}</span>
      )}
    </button>
  );
}
