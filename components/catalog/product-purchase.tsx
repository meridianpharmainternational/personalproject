"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { ArrowRight, Check, ListPlus, MessageCircle, Minus, Plus } from "lucide-react";
import { enquiryList, itemKey, useEnquiryList, type EnquiryItem } from "@/lib/enquiry-list";
import { toAddInput } from "@/lib/enquiry-actions";
import { announce, toast } from "@/lib/ui-store";
import { formatEnquiryItems, keepTogether } from "@/lib/format";
import { whatsappLink } from "@/lib/site";
import type { CatalogItem } from "@/lib/catalog";

const MAX_QTY = 100000; // mirrors the store's clamp
const clampQty = (n: number) => (Number.isFinite(n) && n >= 1 ? Math.min(MAX_QTY, Math.floor(n)) : 1);
const packs = (n: number) => `${n} pack${n === 1 ? "" : "s"}`;

/**
 * No strength is chosen and the product's listed lines all have a strength:
 * the store skips a "to be advised" input for a product that is already
 * listed, so adding would change nothing. `listed` is this product's lines.
 */
const vagueListed = (selected: string[], listed: EnquiryItem[]) =>
  !selected.length && listed.length > 0 && !listed.some((c) => c.strength === null);

/**
 * Product page purchase block: multi-select strength chips, a packs stepper
 * and the enquiry actions. Selecting several strengths adds one line per
 * strength; selecting none adds one line with strength "to be advised" (null).
 * When the product's only listed line is "to be advised", selected strengths
 * refine that line rather than sit beside it (the store does it; see refine).
 * "Add" keeps the buyer on the page (toast + live region confirm it);
 * "Enquire now" adds and opens the enquiry drawer.
 */
export function ProductPurchase({ product }: { product: CatalogItem }) {
  const uid = useId();
  const hintId = `${uid}-strength-hint`;
  const qtyId = `${uid}-qty`;
  const qtyHelpId = `${uid}-qty-help`;
  const summaryId = `${uid}-summary`;

  const strengths = product.strengths;
  const [selected, setSelected] = useState<string[]>(() => (strengths.length === 1 ? [strengths[0]] : []));
  const [qtyText, setQtyText] = useState("1");
  const [qtyDirty, setQtyDirty] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const qtyInput = useRef<HTMLInputElement>(null);

  const { items } = useEnquiryList();
  const lines = items.filter((i) => i.medicineId === product.id);

  const qty = clampQty(parseInt(qtyText, 10));
  const chosen: (string | null)[] = selected.length ? selected : [null];

  useEffect(() => {
    if (!justAdded) return;
    const t = window.setTimeout(() => setJustAdded(false), 1600);
    return () => window.clearTimeout(t);
  }, [justAdded]);

  // Keep the chosen strengths in the product's own order.
  const toggleStrength = (s: string) =>
    setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : strengths.filter((x) => x === s || cur.includes(x))));

  const setQty = (n: number) => {
    setQtyText(String(clampQty(n)));
    setQtyDirty(true);
  };

  // "−" disables at 1; when that happens from the keyboard (click detail 0),
  // move focus into the input so it is not dropped to <body>. Pointer taps
  // leave focus alone so no on-screen keyboard pops up.
  const decrement = (e: MouseEvent<HTMLButtonElement>) => {
    setQty(qty - 1);
    if (qty - 1 <= 1 && e.detail === 0) qtyInput.current?.focus();
  };

  const onQtyKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setQty(qty + 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setQty(qty - 1);
    }
  };

  /**
   * The product's only listed line is "to be advised" (null), e.g. added from a
   * card, row or search, and the buyer has now picked strengths. The store
   * refines that line instead of listing the strengths beside it: it becomes
   * the first strength, in the same place and with the same packs unless the
   * stepper was changed (an undefined qty keeps them), and the other strengths
   * follow it. The store's confirmation names them all ("Cenforce 25 mg, 50 mg
   * added") and its Undo (undoAdd) puts the "to be advised" line back.
   */
  const refine = (open: boolean) => {
    const inputs = selected.map((s, n) => toAddInput(product, s, n === 0 && !qtyDirty ? undefined : qty));
    enquiryList.addMany(inputs, { open });
    if (!open) setJustAdded(true);
  };

  const submit = (open: boolean) => {
    const current = enquiryList.getSnapshot().items;
    const listed = current.filter((c) => c.medicineId === product.id);
    if (selected.length && listed.length === 1 && listed[0].strength === null) {
      refine(open);
      return;
    }
    const inputs = chosen.map((s) => toAddInput(product, s, qty));
    // No strength chosen, but the product is already listed with real
    // strengths: the store treats the "to be advised" input as already listed,
    // so nothing is added. "Enquire now" just opens the list; "Add" lets the
    // store confirm "… is already in your list" (toast + announcement) and
    // does not show the button's added state.
    if (vagueListed(selected, listed)) {
      if (open) enquiryList.open();
      else enquiryList.addMany(inputs);
      return;
    }
    const find = (s: string | null) => current.find((c) => c.key === itemKey(product.id, s));
    const fresh = inputs.filter((i) => !find(i.strength));
    // Only overwrite packs on existing lines when the buyer actually changed the stepper.
    const stale = qtyDirty
      ? inputs.map((i) => find(i.strength)).filter((c): c is EnquiryItem => !!c && c.qty !== qty)
      : [];

    stale.forEach((c) => enquiryList.setQty(c.key, qty));

    if (fresh.length || !stale.length) {
      // Adds the new lines (the store skips duplicates) and fires the toast/announcement.
      enquiryList.addMany(inputs, { open });
    } else {
      const label = stale.length === 1 ? [product.name, stale[0].strength].filter(Boolean).join(" ") : product.name;
      if (open) enquiryList.open();
      else toast.show(`${label} updated · ${packs(qty)}`, [{ label: "View list", run: () => enquiryList.open() }]);
      announce(`${label} updated to ${packs(qty)} in your enquiry list.`);
    }
    if (!open && (fresh.length || stale.length)) setJustAdded(true);
  };

  const strengthText = strengths.length
    ? selected.length
      ? selected.map(keepTogether).join(", ")
      : "strength to be advised"
    : null;
  const adds = `Adds ${chosen.length} line${chosen.length === 1 ? "" : "s"}: ${[
    strengthText,
    keepTogether(`${packs(qty)}${chosen.length > 1 ? " each" : ""}`),
  ]
    .filter(Boolean)
    .join(" · ")}`;
  // Adding would change nothing (see vagueListed), so say so instead.
  const summary = vagueListed(selected, lines)
    ? strengths.length
      ? "Already in your list: choose a strength to add another line"
      : "Already in your list"
    : adds;

  const wa = whatsappLink(
    `Hello, I would like pricing and availability for:\n${formatEnquiryItems(
      chosen.map((s) => ({ name: product.name, molecule: product.molecule, form: product.form, strength: s, qty })),
    )}`,
  );

  return (
    <form
      className="mt-8"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
    >
      {strengths.length > 0 && (
        <fieldset aria-describedby={hintId}>
          <legend className="label">Strength</legend>
          <p id={hintId} className="field-help mt-0">
            {"Select one or more, or leave blank for “to be advised”."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {strengths.map((s) => {
              const on = selected.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  className="toggle-chip"
                  aria-pressed={on}
                  onClick={() => toggleStrength(s)}
                >
                  {on && <Check aria-hidden size={16} strokeWidth={2} />}
                  {keepTogether(s)}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className={strengths.length > 0 ? "mt-6" : undefined}>
        <label htmlFor={qtyId} className="label">
          Packs
        </label>
        <div className="qty">
          <button type="button" aria-label="Fewer packs" disabled={qty <= 1} onClick={decrement}>
            <Minus aria-hidden size={18} strokeWidth={1.75} />
          </button>
          <input
            ref={qtyInput}
            id={qtyId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            aria-describedby={qtyHelpId}
            value={qtyText}
            onChange={(e) => {
              setQtyText(e.target.value.replace(/\D/g, "").slice(0, 6));
              setQtyDirty(true);
            }}
            onBlur={() => setQtyText(String(qty))}
            onKeyDown={onQtyKey}
          />
          <button type="button" aria-label="More packs" disabled={qty >= MAX_QTY} onClick={() => setQty(qty + 1)}>
            <Plus aria-hidden size={18} strokeWidth={1.75} />
          </button>
        </div>
        <p id={qtyHelpId} className="field-help">
          {chosen.length > 1 ? "Packs per strength. " : ""}You can change this later in your enquiry list.
        </p>
      </div>

      <p id={summaryId} className="mt-6 text-sm text-fg-muted">
        {summary}
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="submit"
          className={`btn btn-enquire btn-lg${justAdded ? " is-just-added" : ""}`}
          aria-describedby={summaryId}
        >
          {justAdded ? <Check aria-hidden strokeWidth={1.75} /> : <ListPlus aria-hidden strokeWidth={1.75} />}
          <span>Add to enquiry list</span>
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-lg"
          aria-describedby={summaryId}
          onClick={() => submit(true)}
        >
          Enquire now
          <ArrowRight aria-hidden strokeWidth={1.75} className="icon-trail" />
        </button>
        {wa && (
          <a className="btn btn-ghost btn-lg" href={wa} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden strokeWidth={1.75} />
            Ask on WhatsApp
            <span className="sr-only"> (opens WhatsApp)</span>
          </a>
        )}
      </div>

      {lines.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-sm border border-leaf-700 bg-leaf-50 py-1 pl-4 pr-1">
          <p className="flex items-center gap-2 font-semibold text-leaf-800">
            <Check aria-hidden size={18} strokeWidth={2} />
            In your enquiry list
          </p>
          <p className="min-w-0 flex-1 font-mono text-sm text-fg">
            {lines
              .map((l) => `${keepTogether(l.strength ?? "To be advised")} · ${keepTogether(packs(l.qty))}`)
              .join("; ")}
          </p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => enquiryList.open()}>
            View list
          </button>
        </div>
      )}
    </form>
  );
}
