"use client";

import { useSyncExternalStore } from "react";
import type { EnquiryLine } from "@/lib/format";

/**
 * The multi-product "Enquiry list" — a tiny external store (no provider needed).
 * Buyers add any number of products from cards / detail pages, adjust strength
 * and quantity in one drawer, and send a single enquiry.
 *
 * - Persisted to localStorage and synced across tabs.
 * - SSR-safe: the server snapshot is always empty; the browser hydrates on the
 *   first subscribe, so there is no hydration mismatch.
 */

export type EnquiryItem = {
  key: string; // `${medicineId}::${strength}`
  medicineId: string;
  name: string;
  molecule: string | null;
  form: string | null;
  strength: string | null; // null = "any / to be advised"
  strengths: string[]; // available options, so strength can change in the drawer
  qty: number; // packs
  image: string | null; // public image URL
};

export type EnquiryListState = {
  items: EnquiryItem[];
  open: boolean;
  /** Bumped on every add — drives the transient "added" confirmation. */
  flash: {
    id: number;
    /**
     * What the confirmation names, always phrased to take a singular verb
     * ("… added", "… is already in your list"): "Cenforce 100 mg",
     * "Cenforce 50 mg, 100 mg", "3 products", "Each of these 3 products".
     * When nothing was added it names the inputs that were not added, or,
     * when some listed lines only took new packs (`updated`), those lines.
     */
    name: string;
    /**
     * Nothing was added or updated, because every input was already listed.
     * False whenever `updated` > 0.
     */
    already: boolean;
    /**
     * Listed lines whose packs this action changed to an input's own qty
     * (`addMany` with `applyQty` only; always 0 otherwise). Undo does not
     * revert these.
     */
    updated: number;
    /**
     * Keys actually added by this action (for Undo), including lines that
     * replaced a "to be advised" line (see `replaced`). Empty when nothing was added.
     */
    keys: string[];
    /**
     * "To be advised" (null strength) lines this action replaced in place with
     * a real strength, each with the index it had before the action. Undo
     * removes `keys`, then puts these back at `at`; `enquiryList.undoAdd(flash)`
     * does both in one step. Empty when nothing was replaced.
     */
    replaced: ReplacedLine[];
    /** The MAX_ITEMS cap stopped at least one input from being added. */
    full: boolean;
    /** Inputs left out because the list was full. */
    skipped: number;
    /**
     * Inputs left out because they were already in the list (an input whose
     * packs were applied under `applyQty` is counted in `updated` instead).
     */
    duplicates: number;
  } | null;
};

export type AddInput = Omit<EnquiryItem, "key" | "qty"> & { qty?: number };

/** A line an add replaced, and its index in the list before that add. */
export type ReplacedLine = { line: EnquiryItem; at: number };

export type AddOptions = {
  open?: boolean;
  /**
   * Default true: a real strength for a product whose only listed line is
   * "to be advised" replaces that line in place instead of sitting beside it.
   * Pass false when the buyer asked for another line ("+ Add another strength").
   */
  refine?: boolean;
};

export type AddManyOptions = AddOptions & {
  /**
   * Default false. Paste-a-list: an input that states its packs (`qty` set)
   * sets them on the line it matches that was listed before this add: the
   * line with its key, or, for a "to be advised" input, the product's line
   * when the product is on exactly one line after the add (a line this add
   * refined counts as that product's line). The packs replace the old count
   * rather than adding to it, the first input with packs per line wins (the
   * one that refined a line included), and an unchanged count is not
   * counted. Changes are counted in `flash.updated`.
   */
  applyQty?: boolean;
};

const STORAGE_KEY = "meridian.enquiry-list.v1";
/** Most lines one enquiry can hold (mirrors the server's enquiryItemsSchema). */
export const MAX_ITEMS = 100;
const MAX_QTY = 100000;
// Per-line text limits, mirroring enquiryItemSchema in lib/validations/enquiry.ts,
// so one long pasted or custom line cannot make the whole enquiry invalid.
const MAX_NAME = 200;
const MAX_MOLECULE = 200;
const MAX_FORM = 80;
const EMPTY: EnquiryListState = { items: [], open: false, flash: null };

let state: EnquiryListState = EMPTY;
let hydrated = false;
let flashId = 0;
const listeners = new Set<() => void>();

export const itemKey = (medicineId: string, strength: string | null) =>
  `${medicineId}::${strength ?? ""}`;

const clampQty = (n: number) =>
  Number.isFinite(n) ? Math.min(MAX_QTY, Math.max(1, Math.round(n))) : 1;

const clampText = (s: string | null | undefined, max: number): string | null =>
  typeof s === "string" && s.trim() ? s.trim().slice(0, max) : null;

/** Normalise an add request into a stored line (clamped to the server's limits). */
function toItem(input: AddInput): EnquiryItem {
  const strength = input.strength || null;
  return {
    key: itemKey(input.medicineId, strength),
    medicineId: input.medicineId,
    name: input.name.trim().slice(0, MAX_NAME),
    molecule: clampText(input.molecule, MAX_MOLECULE),
    form: clampText(input.form, MAX_FORM),
    strength,
    strengths: input.strengths,
    qty: clampQty(input.qty ?? 1),
    image: input.image,
  };
}

const lineLabel = (i: { name: string; strength: string | null }) =>
  [i.name, i.strength].filter(Boolean).join(" ");

/**
 * Name a group of lines for the add confirmation, e.g. "Cenforce 100 mg",
 * "Cenforce 50 mg, 100 mg", "Cenforce (5 strengths)", or `many(n)` for
 * several different products.
 */
function describe(lines: EnquiryItem[], many: (n: number) => string): string {
  const first = lines[0];
  if (!first) return many(0);
  if (lines.length === 1) return lineLabel(first);
  if (lines.every((l) => l.medicineId === first.medicineId)) {
    const strengths = lines.map((l) => l.strength).filter((s): s is string => !!s);
    if (strengths.length === lines.length) {
      return strengths.length <= 3
        ? `${first.name} ${strengths.join(", ")}`
        : `${first.name} (${strengths.length} strengths)`;
    }
  }
  return many(lines.length);
}

const products = (n: number) => `${n} product${n === 1 ? "" : "s"}`;

/**
 * Products whose only listed line is "to be advised" (null strength), mapped
 * to that line's index. A real strength for one of them refines that line.
 */
function soleVagueLines(items: EnquiryItem[]): Map<string, number> {
  const lines = new Map<string, number>();
  for (const i of items) lines.set(i.medicineId, (lines.get(i.medicineId) ?? 0) + 1);
  const out = new Map<string, number>();
  items.forEach((i, at) => {
    if (i.strength === null && lines.get(i.medicineId) === 1) out.set(i.medicineId, at);
  });
  return out;
}

/**
 * The line that replaces a "to be advised" one: it keeps that line's packs
 * unless the input names its own.
 */
const refined = (item: EnquiryItem, input: AddInput, vague: EnquiryItem): EnquiryItem =>
  input.qty === undefined ? { ...item, qty: vague.qty } : item;

function sanitize(raw: unknown): EnquiryItem[] {
  if (!Array.isArray(raw)) return [];
  const out: EnquiryItem[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const i = r as Partial<EnquiryItem>;
    if (typeof i.medicineId !== "string" || typeof i.name !== "string") continue;
    const strength = typeof i.strength === "string" && i.strength ? i.strength : null;
    out.push({
      key: itemKey(i.medicineId, strength),
      medicineId: i.medicineId,
      name: i.name.trim().slice(0, MAX_NAME),
      molecule: clampText(i.molecule, MAX_MOLECULE),
      form: clampText(i.form, MAX_FORM),
      strength,
      strengths: Array.isArray(i.strengths) ? i.strengths.map(String).slice(0, 40) : [],
      qty: clampQty(Number(i.qty)),
      image: typeof i.image === "string" ? i.image : null,
    });
  }
  return out.slice(0, MAX_ITEMS);
}

function emit() {
  listeners.forEach((l) => l());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...state, items: sanitize(JSON.parse(raw)) };
  } catch {
    /* storage unavailable (private mode etc.) — keep in memory only */
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    try {
      state = { ...state, items: sanitize(e.newValue ? JSON.parse(e.newValue) : []) };
    } catch {
      state = { ...state, items: [] };
    }
    emit();
  });
}

function commit(next: Partial<EnquiryListState>, persist = true) {
  state = { ...state, ...next };
  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      /* ignore */
    }
  }
  emit();
}

export const enquiryList = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    if (!hydrated) {
      hydrate();
      if (state.items.length) queueMicrotask(emit);
    }
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => state,
  getServerSnapshot: () => EMPTY,

  /**
   * Add a product (no-op on qty if the same product+strength is already listed).
   * A "to be advised" (null strength) add for a product that already has any
   * line is treated as already listed, so it never sits beside real strengths.
   * The other way round, a real strength for a product whose only line is
   * "to be advised" replaces that line in place (same index, its packs unless
   * the input names them; recorded in `flash.replaced` for Undo) unless
   * `opts.refine` is false. At MAX_ITEMS nothing is added and the flash
   * carries `full` instead; a refine does not grow the list, so it still works.
   */
  add(input: AddInput, opts?: AddOptions) {
    hydrate();
    const item = toItem(input);
    const already = state.items.some(
      (i) => i.key === item.key || (item.strength === null && i.medicineId === item.medicineId),
    );
    const at =
      already || item.strength === null || opts?.refine === false
        ? undefined
        : soleVagueLines(state.items).get(item.medicineId);
    if (at !== undefined) {
      const vague = state.items[at];
      const line = refined(item, input, vague);
      const items = [...state.items];
      items[at] = line;
      commit({
        items,
        open: opts?.open ?? state.open,
        flash: {
          id: ++flashId,
          name: lineLabel(line),
          already: false,
          updated: 0,
          keys: [line.key],
          replaced: [{ line: vague, at }],
          full: false,
          skipped: 0,
          duplicates: 0,
        },
      });
      return;
    }
    const full = !already && state.items.length >= MAX_ITEMS;
    const inserted = !already && !full;
    commit({
      items: inserted ? [...state.items, item] : state.items,
      open: opts?.open ?? state.open,
      flash: {
        id: ++flashId,
        name: lineLabel(item),
        already,
        updated: 0,
        keys: inserted ? [item.key] : [],
        replaced: [],
        full,
        skipped: full ? 1 : 0,
        duplicates: already ? 1 : 0,
      },
    });
  },

  /**
   * Add several products in one step (paste-a-list, bulk table selection,
   * several strengths from a product page). Lines already listed are skipped,
   * as is a "to be advised" (null strength) input for a product that already
   * has any line; lines past MAX_ITEMS are dropped and reported through
   * `full` / `skipped`. When a product's only listed line is "to be advised",
   * the batch's first real strength for it replaces that line in place (as in
   * `add`, recorded in `flash.replaced`; not capped, since the list does not
   * grow) and any further strengths of it are appended as usual. With
   * `opts.applyQty`, inputs that state their packs also update the listed
   * lines they match, in the same commit (see `AddManyOptions`).
   */
  addMany(inputs: AddInput[], opts?: AddManyOptions) {
    hydrate();
    if (!inputs.length) {
      if (opts?.open) commit({ open: true }, false);
      return;
    }
    const listed = new Set(state.items.map((i) => i.key));
    const listedMed = new Set(state.items.map((i) => i.medicineId));
    const seen = new Set(listed);
    const items = [...state.items];
    // Only lines listed before this add are refined; `items` keeps their
    // indices, since new lines are only appended.
    const vagueAt = opts?.refine === false ? new Map<string, number>() : soleVagueLines(state.items);
    const added: EnquiryItem[] = [];
    const replaced: ReplacedLine[] = [];
    const existing: EnquiryItem[] = []; // inputs already in the list before this add
    const capped: EnquiryItem[] = []; // inputs dropped because the list is full
    // Lines whose packs an input of this batch already set (a refine that
    // named its packs); for applyQty's "first input per line wins".
    const claimed = new Set<string>();
    for (const input of inputs) {
      const item = toItem(input);
      if (item.strength === null && listedMed.has(item.medicineId)) {
        // The product is already listed (with a strength or as "to be advised"):
        // a vague line beside it would only need deleting. Count the product once.
        if (!existing.some((e) => e.medicineId === item.medicineId)) existing.push(item);
        continue;
      }
      if (seen.has(item.key)) {
        // Count each pre-existing line once; repeats within this batch are simply merged.
        if (listed.has(item.key) && !existing.some((e) => e.key === item.key)) existing.push(item);
        continue;
      }
      seen.add(item.key);
      const at = item.strength === null ? undefined : vagueAt.get(item.medicineId);
      if (at !== undefined) {
        // The product's only line was "to be advised": this strength takes its
        // place, so the enquiry does not carry both.
        vagueAt.delete(item.medicineId);
        const line = refined(item, input, items[at]);
        replaced.push({ line: items[at], at });
        items[at] = line;
        added.push(line);
        if (input.qty !== undefined) claimed.add(line.key);
        continue;
      }
      if (items.length >= MAX_ITEMS) {
        capped.push(item);
        continue;
      }
      items.push(item);
      added.push(item);
    }

    // applyQty: inputs that state their packs set them on the lines listed
    // before this add that they match (or on the line that refined one).
    const updatedLines: EnquiryItem[] = [];
    const updatedBy = new Set<string>(); // input keys whose packs were applied
    if (opts?.applyQty) {
      const lines = new Map<string, number>();
      for (const i of items) lines.set(i.medicineId, (lines.get(i.medicineId) ?? 0) + 1);
      for (const input of inputs) {
        if (input.qty === undefined) continue;
        const strength = input.strength || null;
        const key = itemKey(input.medicineId, strength);
        let at = listed.has(key) ? items.findIndex((i) => i.key === key) : -1;
        if (at === -1 && strength === null && listedMed.has(input.medicineId) && lines.get(input.medicineId) === 1) {
          at = items.findIndex((i) => i.medicineId === input.medicineId);
        }
        if (at === -1) continue;
        const line = items[at];
        if (claimed.has(line.key)) continue;
        claimed.add(line.key);
        const qty = clampQty(input.qty);
        if (line.qty === qty) continue;
        items[at] = { ...line, qty };
        updatedLines.push(items[at]);
        updatedBy.add(key);
      }
    }
    // An input whose packs were applied was not simply left out as listed.
    const dupes = updatedBy.size ? existing.filter((e) => !updatedBy.has(e.key)) : existing;

    const updated = updatedLines.length;
    const full = capped.length > 0;
    const already = added.length === 0 && !full && updated === 0;
    const name = added.length
      ? describe(added, products)
      : full
        ? describe(capped, products)
        : updated
          ? describe(updatedLines, products)
          : describe(existing, (n) => `Each of these ${n} products`);
    commit({
      items: added.length || updated ? items : state.items,
      open: opts?.open ?? state.open,
      flash: {
        id: ++flashId,
        name,
        already,
        updated,
        keys: added.map((a) => a.key),
        replaced,
        full,
        skipped: capped.length,
        duplicates: dupes.length,
      },
    });
  },

  /** Remove the given keys (Undo for an add). */
  removeKeys(keys: string[]) {
    if (!keys.length) return;
    const drop = new Set(keys);
    commit({ items: state.items.filter((i) => !drop.has(i.key)) });
  },

  /**
   * Undo an add in one step: remove the lines it added (`keys`), then put the
   * "to be advised" lines it replaced back where they were (`replaced`, in
   * index order, so several refines in one batch land in their old places).
   * A replaced line that is listed again meanwhile is not duplicated; lines
   * past MAX_ITEMS are dropped.
   */
  undoAdd({ keys, replaced = [] }: { keys: string[]; replaced?: ReplacedLine[] }) {
    if (!keys.length && !replaced.length) return;
    const drop = new Set(keys);
    const items = state.items.filter((i) => !drop.has(i.key));
    const have = new Set(items.map((i) => i.key));
    for (const { line, at } of [...replaced].sort((a, b) => a.at - b.at)) {
      if (have.has(line.key) || items.length >= MAX_ITEMS) continue;
      const i = Number.isFinite(at) ? Math.min(items.length, Math.max(0, Math.floor(at))) : items.length;
      items.splice(i, 0, line);
      have.add(line.key);
    }
    commit({ items });
  },

  /**
   * Put previously removed lines back (Undo for a remove). `at` is the index
   * the first line had before it was removed (clamped to the current list);
   * without it the lines go back at the end. Lines past MAX_ITEMS are dropped,
   * never lines that are already listed.
   */
  restore(lines: EnquiryItem[], at?: number) {
    const have = new Set(state.items.map((i) => i.key));
    const back = lines
      .filter((l) => !have.has(l.key))
      .slice(0, Math.max(0, MAX_ITEMS - state.items.length));
    if (!back.length) return;
    const items = [...state.items];
    const i =
      at === undefined || !Number.isFinite(at)
        ? items.length
        : Math.min(items.length, Math.max(0, Math.floor(at)));
    items.splice(i, 0, ...back);
    commit({ items });
  },

  remove(key: string) {
    commit({ items: state.items.filter((i) => i.key !== key) });
  },

  /** Remove every line for a medicine (used by the card toggle). */
  removeMedicine(medicineId: string) {
    commit({ items: state.items.filter((i) => i.medicineId !== medicineId) });
  },

  setQty(key: string, qty: number) {
    commit({ items: state.items.map((i) => (i.key === key ? { ...i, qty: clampQty(qty) } : i)) });
  },

  /** Change strength; merges with an existing identical line if needed. */
  setStrength(key: string, strength: string | null) {
    const cur = state.items.find((i) => i.key === key);
    if (!cur) return;
    const nextKey = itemKey(cur.medicineId, strength || null);
    if (nextKey === key) return;
    const clash = state.items.find((i) => i.key === nextKey);
    const items = clash
      ? state.items
          .filter((i) => i.key !== key)
          .map((i) => (i.key === nextKey ? { ...i, qty: clampQty(i.qty + cur.qty) } : i))
      : state.items.map((i) =>
          i.key === key ? { ...i, strength: strength || null, key: nextKey } : i,
        );
    commit({ items });
  },

  clear() {
    commit({ items: [] });
  },

  open() {
    commit({ open: true }, false);
  },
  close() {
    commit({ open: false }, false);
  },
  dismissFlash() {
    commit({ flash: null }, false);
  },
};

export function useEnquiryList(): EnquiryListState {
  return useSyncExternalStore(
    enquiryList.subscribe,
    enquiryList.getSnapshot,
    enquiryList.getServerSnapshot,
  );
}

/** Lines for submission / WhatsApp text. */
export function toLines(items: EnquiryItem[]): EnquiryLine[] {
  return items.map(({ name, molecule, form, strength, qty }) => ({
    name,
    molecule,
    form,
    strength,
    qty,
  }));
}
