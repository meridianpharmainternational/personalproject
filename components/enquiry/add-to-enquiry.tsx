"use client";

import { useEffect, useState } from "react";
import { Check, ListPlus, Plus } from "lucide-react";
import { enquiryList, useEnquiryList } from "@/lib/enquiry-list";
import {
  removeLineWithUndo,
  removeMedicineWithUndo,
  toAddInput,
  type ProductLike,
} from "@/lib/enquiry-actions";
import { announce } from "@/lib/ui-store";

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
 * results, table). One tap adds; tapping again removes what it added (with
 * Undo in the toast). It never moves the user's scroll position.
 *
 * - variant="button": green `btn-enquire` with label ("Add to enquiry" /
 *   "In enquiry list"). While in the list, its accessible name also states
 *   the action ("… Press to remove.") so pressing it is never a surprise.
 * - variant="icon": 44px icon button for dense rows and search results.
 *
 * `strength` is the one strength the buyer already named (typed "100mg" or
 * filtered by it), so the line is added with it instead of "Any / to be
 * advised" and they don't have to pick it again in the drawer. Pass it only
 * when exactly one strength matched; a value the product doesn't offer is
 * ignored, and leaving it out keeps the default (the sole strength, else Any).
 *
 * With such a strength (on a product that has several), the control is about
 * that one line: it shows "In enquiry list" only when that strength is listed,
 * and pressing it then removes just that line. So a buyer who listed
 * "Cenforce 100 mg" and now searches "cenforce 50mg" can add the 50 mg line
 * too, and nothing else they listed is removed. Without one, the control
 * covers the whole product, as before.
 */
export function AddToEnquiry({
  product,
  strength,
  variant = "button",
  size = "sm",
  className = "",
}: {
  product: ProductLike;
  strength?: string;
  variant?: "button" | "icon";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { items } = useEnquiryList();
  const [justAdded, setJustAdded] = useState(false);
  const label = productLabel(product);
  const picked = strength && product.strengths.includes(strength) ? strength : undefined;
  // Scope the control to the picked strength only when there is a choice; a
  // sole strength and "Any" mean the same product line.
  const scoped = picked !== undefined && product.strengths.length > 1;
  const lines = items.filter((i) => i.medicineId === product.id);
  const pickedLine = scoped ? lines.find((i) => i.strength === picked) : undefined;
  const inList = scoped ? pickedLine !== undefined : lines.length > 0;
  // Name what the control adds or removes ("Cenforce, Tablets, 100 mg");
  // productLabel already carries the strength when it is the product's only one.
  const addLabel = scoped ? `${label}, ${picked}` : label;

  useEffect(() => {
    if (!justAdded) return;
    const t = window.setTimeout(() => setJustAdded(false), 400);
    return () => window.clearTimeout(t);
  }, [justAdded]);

  const toggle = () => {
    // The toast's Undo is hard to reach by keyboard before it auto-dismisses,
    // so tell screen-reader users how to recover from this control instead.
    const removedMsg = `${addLabel} removed from your enquiry list. Press the button again to add it back.`;
    if (pickedLine) {
      // Only the strength this control is about; the product's other lines stay.
      removeLineWithUndo(pickedLine);
      announce(removedMsg); // replaces the default announcement (the last one is read)
    } else if (inList) {
      removeMedicineWithUndo(product.id, label, { announceMsg: removedMsg });
    } else {
      enquiryList.add(toAddInput(product, picked));
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
            ? `${addLabel} is in your enquiry list. Remove it`
            : `Add ${addLabel} to enquiry list`
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
        <span className="sr-only"> — {addLabel}. Press to remove.</span>
      ) : (
        <span className="sr-only"> — {addLabel}</span>
      )}
    </button>
  );
}
