"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ClipboardList, Copy, MessageCircle, Minus, Plus, Trash2, X } from "lucide-react";
import { enquiryList, itemKey, toLines, useEnquiryList, type EnquiryItem } from "@/lib/enquiry-list";
import { removeLineWithUndo } from "@/lib/enquiry-actions";
import { formatEnquiryItems } from "@/lib/format";
import { whatsappLink } from "@/lib/site";
import { useDialog } from "@/lib/use-dialog";
import { announce, toast } from "@/lib/ui-store";
import { ProductSearch } from "@/components/search/product-search";
import { PasteList } from "@/components/enquiry/paste-list";
import { productLabel } from "@/components/enquiry/add-to-enquiry";
// Type only: the form itself (react-hook-form, zod, the country list) is
// loaded on first open, not shipped with every page from the root layout.
import type { EnquiryDetailsForm } from "@/components/enquiry/enquiry-details-form";

type DetailsFormComponent = typeof EnquiryDetailsForm;
const loadDetailsForm = () =>
  import("@/components/enquiry/enquiry-details-form").then((m) => m.EnquiryDetailsForm);

/** What the paste box hands the drawer through `handleRef`: add every previewed line. */
type PasteHandle = { add: () => number };

const PASTE_EVENT = "meridian:open-paste";

/** Open the enquiry drawer with the "Paste a list" box expanded. */
export function openPasteList() {
  window.dispatchEvent(new Event(PASTE_EVENT));
}

type Step = 1 | 2 | 3;

/*
 * Stable React identity for each line. The store's `key` (medicine + strength)
 * is a de-duplication key and changes when the strength changes; keying React
 * on it would remount the line and drop the focused <select> (and replay the
 * .is-new flash). The drawer is the only caller of setStrength, so it moves the
 * id over to the new key itself (see changeStrength).
 */
const lineUids = new Map<string, string>();
let lineSeq = 0;
function lineUid(key: string) {
  let uid = lineUids.get(key);
  if (!uid) {
    uid = `enq-l${++lineSeq}`;
    lineUids.set(key, uid);
  }
  return uid;
}

/** Keep every line of the same product together, in first-added order. */
function groupByProduct(items: EnquiryItem[]): EnquiryItem[] {
  const groups = new Map<string, EnquiryItem[]>();
  for (const i of items) {
    const g = groups.get(i.medicineId);
    if (g) g.push(i);
    else groups.set(i.medicineId, [i]);
  }
  if (groups.size === items.length) return items;
  const out: EnquiryItem[] = [];
  groups.forEach((g) => out.push(...g));
  return out;
}

const NO_UIDS: ReadonlySet<string> = new Set();

/**
 * The Enquiry list drawer: 01 List → 02 Details → 03 Sent.
 * Right-side panel on desktop, bottom sheet under 640px. Proper modal dialog
 * (inert background, Escape, focus return) via useDialog.
 */
export function EnquiryDrawer() {
  const { items: storeItems, open, flash } = useEnquiryList();
  // Display, WhatsApp text and submission all use the same grouped order.
  const items = useMemo(() => groupByProduct(storeItems), [storeItems]);
  const titleId = useId();
  const formId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pasteRef = useRef<HTMLDivElement>(null);
  /** The lines of the latest submit, captured when the form submits (see onSent). */
  const sentItems = useRef<EnquiryItem[] | null>(null);

  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [sentSummary, setSentSummary] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  // Each openPasteList() asks for one scroll to the paste box; `pasteScrolled`
  // records the last request served, so step 1 remounting later ("Back to
  // list") does not scroll again.
  const [pasteReq, setPasteReq] = useState(0);
  const pasteScrolled = useRef(0);
  // The paste box's text and choices live here, not in PasteList (which only
  // renders on step 1), so lines not yet added survive Continue → Back to list
  // and closing and reopening the drawer, like the details draft.
  const [pasteText, setPasteText] = useState("");
  const [pastePicks, setPastePicks] = useState<Record<string, string>>({});
  /** Previewed paste lines not yet added to the list (reported by PasteList). */
  const [pastePending, setPastePending] = useState(0);
  const pasteHandle = useRef<PasteHandle | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  /** "Send via WhatsApp instead" was clicked: offer to clear the lines it sent. */
  const [waSent, setWaSent] = useState(false);

  // Step 2's form, loaded on first open. Send stays disabled until it is in.
  const [DetailsForm, setDetailsForm] = useState<DetailsFormComponent | null>(null);
  const [formFailed, setFormFailed] = useState(false);
  const formLoading = useRef(false);
  const loadForm = useCallback(() => {
    if (formLoading.current) return;
    formLoading.current = true;
    setFormFailed(false);
    loadDetailsForm()
      // A component is a function: wrap it so useState does not call it as an updater.
      .then((C) => setDetailsForm(() => C))
      .catch(() => setFormFailed(true))
      .finally(() => {
        formLoading.current = false;
      });
  }, []);

  // Lines just added (store `flash.keys`) get the .is-new flash for 900ms —
  // not every line each time the list mounts.
  const [recent, setRecent] = useState<ReadonlySet<string>>(NO_UIDS);
  const seenFlash = useRef(flash?.id ?? 0);
  const recentTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!flash || flash.id === seenFlash.current) return;
    seenFlash.current = flash.id;
    if (!flash.keys.length) return;
    setRecent(new Set(flash.keys.map((k) => lineUid(k))));
    window.clearTimeout(recentTimer.current);
    recentTimer.current = window.setTimeout(() => setRecent(NO_UIDS), 900);
  }, [flash]);
  useEffect(() => () => window.clearTimeout(recentTimer.current), []);

  // Mount when the store opens (always on step 1, the list); close animation
  // when it closes elsewhere.
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      setStep(1);
      setWaSent(false);
    } else if (mounted && !closing) {
      setClosing(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Start loading the details form as soon as the drawer first opens, so it is
  // usually in by the time the buyer presses Continue. A failed load is tried
  // again on the next open (or from the step-2 "Try again" button).
  useEffect(() => {
    if (mounted && !DetailsForm) loadForm();
  }, [mounted, DetailsForm, loadForm]);

  useEffect(() => {
    const onPaste = () => {
      setStep(1);
      setPasteOpen(true);
      setPasteReq((r) => r + 1);
      enquiryList.open();
    };
    window.addEventListener(PASTE_EVENT, onPaste);
    return () => window.removeEventListener(PASTE_EVENT, onPaste);
  }, []);

  // Once the drawer is up on step 1 with the box expanded, scroll the drawer
  // body (not the page) so the box starts near its top. Focus stays on the title.
  useEffect(() => {
    if (pasteReq === pasteScrolled.current || !mounted || closing || step !== 1 || !pasteOpen) return;
    const raf = requestAnimationFrame(() => {
      const body = bodyRef.current;
      const box = pasteRef.current;
      if (!body || !box) return;
      pasteScrolled.current = pasteReq;
      const b = body.getBoundingClientRect();
      const r = box.getBoundingClientRect();
      if (r.top >= b.top && r.bottom <= b.bottom) return; // already fully in view
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      body.scrollTo({ top: body.scrollTop + r.top - b.top - 8, behavior: reduce ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [pasteReq, mounted, closing, step, pasteOpen]);

  const finishClose = useCallback(() => {
    setClosing(false);
    setMounted(false);
    if (enquiryList.getSnapshot().open) enquiryList.close();
    setStep((s) => (s === 3 ? 1 : s));
    setCopied(false);
    setWaSent(false);
    // PasteList unmounts with the drawer; it reports its count again on reopen.
    setPastePending(0);
  }, []);

  const requestClose = useCallback(() => setClosing(true), []);

  // Fallback if animationend never fires (e.g. reduced motion edge cases).
  useEffect(() => {
    if (!closing) return;
    const t = window.setTimeout(finishClose, 360);
    return () => window.clearTimeout(t);
  }, [closing, finishClose]);

  // Focus returns to the opener; if it is gone (a dismissed toast's "View
  // list", a hidden bar), to the header's Enquiry list button.
  useDialog(mounted && !closing, containerRef, requestClose, titleRef, () =>
    document.querySelector<HTMLElement>(".site-header .enq-btn"),
  );

  // Move focus to the title whenever the step changes, so screen readers follow.
  useEffect(() => {
    if (mounted && !closing) requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
  }, [step, mounted, closing]);

  if (!mounted) return null;

  const n = items.length;
  const wa = whatsappLink(
    `Hello Meridian Pharma International, I'd like a quotation for:\n${formatEnquiryItems(toLines(items))}`,
  );

  // Remove only the lines that were sent: a line added (e.g. in another tab)
  // while the request was in flight stays in the list for the next enquiry.
  const onSent = () => {
    const sent = sentItems.current ?? items;
    sentItems.current = null;
    setSentSummary(formatEnquiryItems(toLines(sent)));
    enquiryList.removeKeys(sent.map((i) => i.key));
    setWaSent(false);
    setStep(3);
    announce("Enquiry sent. Our export team will reply by email within one business day.");
  };

  // Continue adds any previewed paste lines first, so they are never dropped
  // by moving on without pressing the paste box's own Add button.
  const k = pastePending;
  const continueToDetails = () => {
    const added = k > 0 ? (pasteHandle.current?.add() ?? 0) : 0;
    if (n + added === 0) return;
    setPastePending(0);
    setStep(2);
  };

  /**
   * Empty the list in one go, with Undo in the toast. The button that ran this
   * unmounts (the list is empty), so focus moves to the drawer title.
   */
  const clearList = () => {
    const snap = enquiryList.getSnapshot().items;
    if (!snap.length) return;
    const lines = `${snap.length} line${snap.length === 1 ? "" : "s"}`;
    enquiryList.clear();
    setWaSent(false);
    setStep(1);
    toast.show(`List cleared (${lines})`, [
      {
        label: "Undo",
        run: () => {
          enquiryList.restore(snap, 0);
          announce(`${lines} restored to your enquiry list.`);
        },
      },
    ]);
    announce(`Enquiry list cleared. ${lines} removed.`);
    requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
  };

  // "Try again" unmounts as the retry starts; keep focus inside the drawer.
  const retryForm = () => {
    titleRef.current?.focus({ preventScroll: true });
    loadForm();
  };

  const pasteProps = {
    open: pasteOpen,
    onToggle: setPasteOpen,
    text: pasteText,
    onText: setPasteText,
    picks: pastePicks,
    onPicks: setPastePicks,
    onPending: setPastePending,
    handleRef: pasteHandle,
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sentSummary);
      setCopied(true);
    } catch {
      /* clipboard unavailable */
    }
  };

  /** Focus an element inside the list once React has committed the change. */
  const focusInList = (selector: string) =>
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(selector)?.focus());

  // Removing a line unmounts its focused Trash button: move focus to the next
  // line's remove button (or the previous one), or the title once empty.
  const removeLine = (line: EnquiryItem, index: number) => {
    removeLineWithUndo(line);
    requestAnimationFrame(() => {
      const btns = listRef.current?.querySelectorAll<HTMLElement>(".enq-line-remove");
      const next = btns && btns.length ? btns[Math.min(index, btns.length - 1)] : null;
      (next ?? titleRef.current)?.focus();
    });
  };

  const changeStrength = (line: EnquiryItem, value: string) => {
    const strength = value || null;
    const nextKey = itemKey(line.medicineId, strength);
    if (nextKey === line.key) return;
    const merged = enquiryList.getSnapshot().items.some((i) => i.key === nextKey);
    if (merged) {
      // The store folds this line into the existing identical one; follow it.
      lineUids.delete(line.key);
      enquiryList.setStrength(line.key, strength);
      focusInList(`[data-uid="${lineUid(nextKey)}"] select`);
      announce(
        `${[line.name, strength ?? "any strength"].join(" ")} was already in your list. Packs combined into one line.`,
      );
      return;
    }
    // Carry the line's React identity over to its new key so it stays mounted.
    const uid = lineUid(line.key);
    lineUids.delete(line.key);
    lineUids.set(nextKey, uid);
    enquiryList.setStrength(line.key, strength);
  };

  // "+ Add another strength": the new line is grouped under its product (see
  // groupByProduct) and takes focus, since this button moves to the new line.
  const addStrength = (line: EnquiryItem, strength: string) => {
    enquiryList.add({
      medicineId: line.medicineId,
      name: line.name,
      molecule: line.molecule,
      form: line.form,
      strengths: line.strengths,
      image: line.image,
      strength,
    });
    focusInList(`[data-uid="${lineUid(itemKey(line.medicineId, strength))}"] select`);
  };

  const STEPS = ["List", "Details", "Sent"];

  return (
    <div ref={containerRef} data-dialog-root>
      <div className="backdrop" onClick={requestClose} aria-hidden="true" />
      <aside
        className={`drawer${closing ? " is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onAnimationEnd={(e) => {
          if (closing && e.target === e.currentTarget) finishClose();
        }}
      >
        <div className="drawer-grip" aria-hidden />
        <div className="drawer-head">
          <h2 id={titleId} ref={titleRef} tabIndex={-1} className="drawer-title flex items-center gap-2 outline-none">
            <ClipboardList aria-hidden className="h-5 w-5 text-navy-700" />
            {step === 3 ? "Enquiry sent" : "Enquiry list"}
            {step !== 3 && (
              <span className="count-badge" data-empty={n === 0 ? "" : undefined}>
                {n}
              </span>
            )}
          </h2>
          <button type="button" className="icon-btn icon-btn-bare" onClick={requestClose} aria-label="Close enquiry list">
            <X aria-hidden />
          </button>
        </div>

        <ol className="drawer-steps" aria-label="Enquiry progress">
          {STEPS.map((label, i) => {
            const s = (i + 1) as Step;
            return (
              <li key={label} aria-current={s === step ? "step" : undefined} className={s < step ? "is-done" : undefined}>
                {String(s).padStart(2, "0")} {label}
              </li>
            );
          })}
        </ol>

        <div ref={bodyRef} className="drawer-body">
          {step === 1 && (
            <>
              {n === 0 ? (
                <div className="py-8">
                  <h3 className="text-h4">Your enquiry list is empty</h3>
                  <p className="mt-2 text-fg-muted">
                    Add products from any card, search result or table row — or paste a list below. Then send them
                    all in one enquiry.
                  </p>
                  <Link href="/medicines" className="btn btn-primary mt-5" onClick={requestClose}>
                    Browse catalogue <ArrowRight aria-hidden className="icon-trail" />
                  </Link>
                </div>
              ) : (
                <ol ref={listRef} aria-label="Products in your enquiry">
                  {items.map((line, idx) => {
                    const uid = lineUid(line.key);
                    return (
                      <Line
                        key={uid}
                        uid={uid}
                        line={line}
                        all={items}
                        isNew={recent.has(uid)}
                        lastOfProduct={items[idx + 1]?.medicineId !== line.medicineId}
                        onRemove={() => removeLine(line, idx)}
                        onStrength={(v) => changeStrength(line, v)}
                        onAddStrength={(s) => addStrength(line, s)}
                      />
                    );
                  })}
                </ol>
              )}
              {n >= 2 && (
                <div className="mt-2 flex justify-end">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={clearList}>
                    Clear list
                  </button>
                </div>
              )}

              <div className="mt-6">
                <p className="label">Add more products</p>
                <ProductSearch mode="inline" />
              </div>
              <div ref={pasteRef} className="mt-4">
                <PasteList {...pasteProps} />
              </div>
            </>
          )}

          {/* Stays mounted (hidden) on step 1 so "Back to list" → Continue keeps
              what the buyer typed. Unmounts on step 3 so a new list starts clean.
              The form sends the `items` it rendered with when submitted, so the
              same lines are captured here, at submit time, for onSent. */}
          {step !== 3 && DetailsForm && (
            <div
              hidden={step !== 2}
              onSubmitCapture={() => {
                sentItems.current = items;
              }}
            >
              <DetailsForm formId={formId} items={items} onSent={onSent} onPendingChange={setPending} />
            </div>
          )}
          {step === 2 && !DetailsForm && (
            <div className="py-6">
              <p role="status" className={formFailed ? undefined : "text-fg-muted"}>
                {formFailed
                  ? `We couldn’t load the details form. Check your connection and try again${wa ? ", or send your list on WhatsApp" : ""}.`
                  : "Loading the details form…"}
              </p>
              {formFailed && (
                <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={retryForm}>
                  Try again
                </button>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="py-6">
              <span className="grid h-10 w-10 place-items-center rounded-sm bg-leaf-700 text-white">
                <Check aria-hidden className="h-6 w-6" />
              </span>
              <h3 className="mt-4">Thank you — your enquiry is on its way</h3>
              <p className="mt-2 text-fg-muted">
                Our export team replies by email within 1 business day with pricing, availability and documentation.
              </p>
              {sentSummary && (
                <pre className="mt-5 whitespace-pre-wrap rounded border border-rule bg-paper p-4 font-mono text-sm text-fg-strong">
                  {sentSummary}
                </pre>
              )}
            </div>
          )}
        </div>

        <div className="drawer-foot">
          {step === 1 && (
            <>
              <button
                type="button"
                className="btn btn-enquire btn-lg btn-block"
                disabled={n === 0 && k === 0}
                onClick={continueToDetails}
              >
                {k > 0 ? (
                  <>
                    Add {k} pasted line{k === 1 ? "" : "s"} &amp; continue
                  </>
                ) : (
                  <>
                    Continue: {n} product{n === 1 ? "" : "s"}
                  </>
                )}{" "}
                <ArrowRight aria-hidden className="icon-trail" />
              </button>
              <button type="button" className="btn btn-ghost" onClick={requestClose}>
                Keep browsing
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button
                type="submit"
                form={formId}
                className="btn btn-enquire btn-lg btn-block"
                disabled={pending || !DetailsForm || n === 0}
              >
                {pending ? (
                  <>
                    <span className="spinner" aria-hidden /> Sending…
                  </>
                ) : (
                  <>
                    Send enquiry for {n} product{n === 1 ? "" : "s"}
                  </>
                )}
              </button>
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-block"
                  onClick={() => setWaSent(true)}
                >
                  <MessageCircle aria-hidden /> Send via WhatsApp instead
                </a>
              )}
              {wa && waSent && n > 0 && (
                <p className="flex flex-wrap items-center justify-center gap-x-1 text-fg-muted">
                  Sent on WhatsApp?
                  <button type="button" className="btn btn-ghost btn-sm" onClick={clearList}>
                    Clear these {n} line{n === 1 ? "" : "s"}
                  </button>
                </p>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                <ArrowLeft aria-hidden /> Back to list
              </button>
            </>
          )}
          {step === 3 && (
            <>
              <button type="button" className="btn btn-primary btn-lg btn-block" onClick={requestClose}>
                Close
              </button>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary btn-sm flex-1" onClick={copy}>
                  {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy summary"}
                </button>
                <button type="button" className="btn btn-secondary btn-sm flex-1" onClick={() => setStep(1)}>
                  Start a new list
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------ one line */

function Line({
  uid,
  line,
  all,
  isNew,
  lastOfProduct,
  onRemove,
  onStrength,
  onAddStrength,
}: {
  uid: string;
  line: EnquiryItem;
  all: EnquiryItem[];
  isNew: boolean;
  /** Only the last line of a product offers "+ Add another strength". */
  lastOfProduct: boolean;
  onRemove: () => void;
  onStrength: (value: string) => void;
  onAddStrength: (strength: string) => void;
}) {
  const id = useId();

  // Same wording as the Add to enquiry controls ("IVERHEAL, Tablets, 12 mg"),
  // but with this line's own strength: a single-strength product's line set to
  // "Any" must not borrow that strength, or two lines could share one name.
  const label = productLabel({
    name: line.name,
    form: line.form,
    strengths: line.strength ? [line.strength] : [],
  });
  const used = new Set(all.filter((i) => i.medicineId === line.medicineId).map((i) => i.strength));
  const unused = lastOfProduct ? line.strengths.find((s) => !used.has(s)) ?? null : null;
  const custom = line.medicineId.startsWith("custom:");
  // Nothing to choose (custom requests, products with no listed strengths): a
  // select offering only "Any / to be advised" would be noise. A strength typed
  // into a paste still gets the select, so it can be changed back to "Any".
  const noStrengths = line.strengths.length === 0 && !line.strength;

  return (
    <li className={isNew ? "enq-line is-new" : "enq-line"} data-uid={uid}>
      <div className="min-w-0">
        <p className="enq-line-name" id={`${id}-n`}>
          {line.name}
        </p>
        {/* Not rendered or read on its own; names the Packs field (via
            aria-labelledby) so each line's stepper is unique. */}
        <span id={`${id}-l`} hidden>
          {label}
        </span>
        <p className="enq-line-sub">
          {custom ? "Custom request — not in catalogue" : [line.molecule, line.form].filter(Boolean).join(" · ")}
        </p>
      </div>
      <button
        type="button"
        className="enq-line-remove"
        onClick={onRemove}
        aria-label={`Remove ${label} from enquiry list`}
      >
        <Trash2 aria-hidden className="h-5 w-5" />
      </button>

      <div className="enq-line-fields">
        {noStrengths ? (
          // min-h-tap centres the note on the Packs stepper beside it.
          <p className="flex min-h-tap items-center text-sm text-fg-muted">
            {custom ? "Custom request" : "Strength to be advised"}
          </p>
        ) : (
          <div>
            <label className="label" htmlFor={`${id}-s`} id={`${id}-s-l`}>
              Strength
            </label>
            <select
              id={`${id}-s`}
              aria-labelledby={`${id}-s-l ${id}-n`}
              className="select"
              value={line.strength ?? ""}
              onChange={(e) => onStrength(e.target.value)}
            >
              <option value="">Any / to be advised</option>
              {line.strengths.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              {line.strength && !line.strengths.includes(line.strength) && (
                <option value={line.strength}>{line.strength}</option>
              )}
            </select>
          </div>
        )}
        <div>
          <span className="label" id={`${id}-q`}>
            Packs
          </span>
          <Qty
            value={line.qty}
            labelledBy={`${id}-q ${id}-l`}
            name={label}
            onChange={(q) => enquiryList.setQty(line.key, q)}
          />
        </div>
        {unused && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onAddStrength(unused)}>
            <Plus aria-hidden /> Add another strength
          </button>
        )}
      </div>
    </li>
  );
}

function Qty({
  value,
  onChange,
  labelledBy,
  name,
}: {
  value: number;
  onChange: (n: number) => void;
  labelledBy: string;
  name: string;
}) {
  const [text, setText] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => setText(String(value)), [value]);

  // Reaching 1 disables "−". For keyboard activation (detail 0) move focus
  // into the field so it is not dropped to <body>; pointer taps leave focus
  // alone so no on-screen keyboard pops up.
  const decrement = (e: ReactMouseEvent<HTMLButtonElement>) => {
    onChange(value - 1);
    if (value - 1 <= 1 && e.detail === 0) inputRef.current?.focus();
  };

  return (
    <div className="qty" role="group" aria-labelledby={labelledBy}>
      <button type="button" onClick={decrement} disabled={value <= 1} aria-label={`Fewer packs of ${name}`}>
        <Minus aria-hidden className="h-4 w-4" />
      </button>
      <input
        ref={inputRef}
        inputMode="numeric"
        pattern="[0-9]*"
        aria-labelledby={labelledBy}
        value={text}
        onChange={(e) => {
          const t = e.target.value.replace(/\D/g, "").slice(0, 6);
          setText(t);
          if (t) onChange(Number(t));
        }}
        onBlur={() => {
          // Show what the store actually kept: empty, "0" (clamped to 1),
          // leading zeros or over-max values all resync to the stored qty.
          if (text !== String(value)) setText(String(value));
        }}
      />
      <button type="button" onClick={() => onChange(value + 1)} aria-label={`More packs of ${name}`}>
        <Plus aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}
