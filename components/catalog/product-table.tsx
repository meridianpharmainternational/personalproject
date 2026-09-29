"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ListPlus } from "lucide-react";
import type { CatalogItem } from "@/lib/catalog";
import { enquiryList } from "@/lib/enquiry-list";
import { toAddInput } from "@/lib/enquiry-actions";
import { announce } from "@/lib/ui-store";
import { AddToEnquiry } from "@/components/enquiry/add-to-enquiry";
import { emphStrength, isRealStrength, tagStrengths } from "@/components/catalog/catalog-model";
import { moleculeLabel } from "@/lib/format";

function Dash() {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">Not specified</span>
    </>
  );
}

/**
 * Tablet/desktop list view: a dense spec table with row selection. The header
 * checkbox selects every row currently shown; while anything is selected a
 * sticky bulk bar offers "Add N to enquiry list" in one step. The bar sits
 * BEFORE the table in the DOM (so keyboard users reach it without tabbing past
 * every row) and is drawn after it with `order-last`, stuck to the bottom.
 * `wide` = the filter sidebar is hidden, so more columns fit (and, from xl, a
 * third strength). `emph` = the same set the grid cards get: norm()'d active
 * strength filters plus digit-bearing search tokens; matched strengths lead.
 */
export function ProductTable({
  items,
  wide,
  emph,
}: {
  items: CatalogItem[];
  wide: boolean;
  emph?: ReadonlySet<string>;
}) {
  const [sel, setSel] = useState<Set<string>>(() => new Set());
  const headRef = useRef<HTMLInputElement>(null);
  // Row toggles announce the running count once the user pauses, not per click.
  const liveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancelCountAnnouncement = () => clearTimeout(liveTimer.current);

  useEffect(() => () => clearTimeout(liveTimer.current), []);

  // Drop selections that are no longer shown (filters changed).
  useEffect(() => {
    setSel((prev) => {
      if (!prev.size) return prev;
      const shown = new Set(items.map((i) => i.id));
      const next = new Set([...prev].filter((id) => shown.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const selected = items.filter((i) => sel.has(i.id));
  const n = selected.length;
  const allOn = items.length > 0 && n === items.length;

  useEffect(() => {
    if (headRef.current) headRef.current.indeterminate = n > 0 && !allOn;
  }, [n, allOn]);

  const toggle = (id: string) => {
    // Every toggled row is a shown one, so the shown count moves by exactly one.
    const count = sel.has(id) ? n - 1 : n + 1;
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    cancelCountAnnouncement();
    liveTimer.current = setTimeout(() => {
      announce(
        count > 0
          ? `${count} selected. Use “Add ${count} to enquiry list” in the selection bar.`
          : "Selection cleared.",
      );
    }, 400);
  };

  const toggleAll = () => {
    cancelCountAnnouncement();
    setSel(allOn ? new Set() : new Set(items.map((i) => i.id)));
  };

  const clear = () => {
    cancelCountAnnouncement();
    setSel(new Set());
    headRef.current?.focus();
  };

  const addSelected = () => {
    cancelCountAnnouncement();
    // A row with one matched strength goes in with that strength, exactly like
    // the row's own add button: it counts as already listed only when that exact
    // strength is listed, a new strength is appended beside the product's other
    // lines, and a sole "Any / to be advised" line is refined in place (keeping
    // its packs; Undo restores it). With no named strength, a product already
    // listed with a real strength is skipped as already listed (a null strength,
    // which the store never adds beside a listed product) rather than gaining
    // another line; anything else takes toAddInput's default.
    const withStrength = new Set(
      enquiryList
        .getSnapshot()
        .items.filter((l) => l.strength !== null)
        .map((l) => l.medicineId),
    );
    enquiryList.addMany(
      selected.map((i) => {
        const s = emphStrength(i.strengths, emph);
        return toAddInput(i, s !== undefined ? s : withStrength.has(i.id) ? null : undefined);
      }),
    );
    setSel(new Set());
    headRef.current?.focus();
  };

  // Column visibility: the results column is ~650px at 1024px with the sidebar, ~970px at its widest.
  const midCol = wide ? "hidden lg:table-cell" : "hidden xl:table-cell";
  // While the Form column is hidden, the Product cell's sub-line carries the form
  // ("Ivermectin · Tablets"), so same-named products (IVERHEAL Tablets / Cream)
  // stay distinguishable; it hides again at the breakpoint where the column shows.
  const formInSub = wide ? "lg:hidden" : "xl:hidden";
  const packCol = wide ? "hidden xl:table-cell" : "hidden 2xl:table-cell";
  // Strength chips stay on one line. With the sidebar open at lg+ the unbreakable
  // cells would outgrow the results column (and be clipped), so there they may
  // wrap — the "+N" chip is bound to the last strength so it never sits alone.
  // Two strengths are shown; with the sidebar hidden, a third joins from xl (below
  // xl the freed width already goes to the Category/Form columns), and the "+N"
  // count switches with it.
  const chipRow = wide ? "flex flex-nowrap gap-1.5" : "flex flex-nowrap gap-1.5 lg:flex-wrap";

  return (
    <div className="flex flex-col">
      {n > 0 && (
        <div
          className="bulk-bar order-last max-lg:[body:has(.enq-bar.is-visible)_&]:bottom-[calc(80px+env(safe-area-inset-bottom))]"
          role="region"
          aria-label="Selected products"
        >
          <p className="font-semibold">
            <span className="font-mono">{n}</span> selected
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-enquire btn-sm" onClick={addSelected}>
              <ListPlus aria-hidden />
              Add {n} to enquiry list
            </button>
            <button type="button" className="btn btn-outline-inverse btn-sm" onClick={clear}>
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="ptable-wrap">
        <table className="ptable">
          <caption className="sr-only">
            Products. Select rows to add several to your enquiry list at once.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="cell-check">
                <label className="check justify-center">
                  <input
                    ref={headRef}
                    type="checkbox"
                    checked={allOn}
                    onChange={() => {
                      toggleAll();
                      announce(allOn ? "Selection cleared." : `${items.length} products selected.`);
                    }}
                    aria-label={`Select all ${items.length} products shown`}
                  />
                </label>
              </th>
              <th scope="col">Product</th>
              <th scope="col" className={midCol}>
                Category
              </th>
              <th scope="col" className={midCol}>
                Form
              </th>
              <th scope="col">Strengths</th>
              <th scope="col" className={packCol}>
                Pack
              </th>
              <th scope="col">Availability</th>
              <th scope="col" className="w-[76px]">
                <span className="sr-only">Add to enquiry list</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const on = sel.has(it.id);
              const strengths = tagStrengths(it.strengths.filter(isRealStrength), emph);
              const [first, second, third] = strengths;
              const more = strengths.length - 2; // "+N" beside two strengths
              const moreWide = strengths.length - 3; // "+N" beside three (wide, xl+)
              const stock = it.availability === "in-stock";
              // Selected rows are filled navy-50, the chips' own fill: flip the chips to white so they
              // stay visible. A matched chip keeps its own is-match border (no border-navy-100 over it).
              const chip = (match: boolean) =>
                on
                  ? match
                    ? "badge badge-code is-match bg-white"
                    : "badge badge-code border-navy-100 bg-white"
                  : match
                    ? "badge badge-code is-match"
                    : "badge badge-code";
              return (
                <tr key={it.id} aria-selected={on}>
                  <td className="cell-check">
                    <label className="check justify-center">
                      <input type="checkbox" checked={on} onChange={() => toggle(it.id)} aria-label={`Select ${it.name}`} />
                    </label>
                  </td>
                  <td className="min-w-[10rem]">
                    <Link href={`/medicines/${it.id}`} className="pname underline-offset-2 hover:underline">
                      {it.name}
                    </Link>
                    {/* With no molecule the whole sub-line is the form, so the <p> itself hides
                        (no empty line) once the Form column is visible. A no-break space binds
                        the dot to the molecule and the form stays whole, so a wrap never starts
                        a line with "·". */}
                    {(it.molecule || it.form) && (
                      <p className={it.molecule ? "psub" : `psub ${formInSub}`}>
                        {moleculeLabel(it.molecule, it.ester)}
                        {it.form && (
                          <span className={formInSub}>
                            {it.molecule ? " · " : ""}
                            <span className="whitespace-nowrap">{it.form}</span>
                          </span>
                        )}
                      </p>
                    )}
                  </td>
                  <td className={`${midCol} whitespace-nowrap`}>{it.category?.name ?? <Dash />}</td>
                  <td className={`${midCol} whitespace-nowrap`}>{it.form ?? <Dash />}</td>
                  <td>
                    {first ? (
                      <div className={chipRow}>
                        <span className={chip(first.match)}>{first.value}</span>
                        {second && (
                          <span className="flex gap-1.5">
                            <span className={chip(second.match)}>{second.value}</span>
                            {wide && third && (
                              <span className={`${chip(third.match)} hidden xl:inline-flex`}>{third.value}</span>
                            )}
                            {more > 0 && (
                              <span className={wide ? `${chip(false)} xl:hidden` : chip(false)}>
                                +{more}
                                <span className="sr-only"> more</span>
                              </span>
                            )}
                            {wide && moreWide > 0 && (
                              <span className={`${chip(false)} hidden xl:inline-flex`}>
                                +{moreWide}
                                <span className="sr-only"> more</span>
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-fg-muted">On request</span>
                    )}
                  </td>
                  <td className={`${packCol} text-sm`}>{it.pack ?? <Dash />}</td>
                  <td>
                    <span className={`badge ${stock ? "badge-stock" : "badge-mto"}`}>{stock ? "In stock" : "Made to order"}</span>
                  </td>
                  <td className="text-right">
                    <AddToEnquiry product={it} strength={emphStrength(it.strengths, emph)} variant="icon" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
