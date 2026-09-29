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
     * When nothing was added it names the inputs that were not added.
     */
    name: string;
    /** Nothing was added because every input was already listed. */
    already: boolean;
    /** Keys actually added by this action (for Undo). Empty when nothing was added. */
    keys: string[];
    /** The MAX_ITEMS cap stopped at least one input from being added. */
    full: boolean;
    /** Inputs left out because the list was full. */
    skipped: number;
    /** Inputs left out because they were already in the list. */
    duplicates: number;
  } | null;
};

export type AddInput = Omit<EnquiryItem, "key" | "qty"> & { qty?: number };

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
   * At MAX_ITEMS nothing is added and the flash carries `full` instead.
   */
  add(input: AddInput, opts?: { open?: boolean }) {
    hydrate();
    const item = toItem(input);
    const already = state.items.some((i) => i.key === item.key);
    const full = !already && state.items.length >= MAX_ITEMS;
    const inserted = !already && !full;
    commit({
      items: inserted ? [...state.items, item] : state.items,
      open: opts?.open ?? state.open,
      flash: {
        id: ++flashId,
        name: lineLabel(item),
        already,
        keys: inserted ? [item.key] : [],
        full,
        skipped: full ? 1 : 0,
        duplicates: already ? 1 : 0,
      },
    });
  },

  /**
   * Add several products in one step (paste-a-list, bulk table selection,
   * several strengths from a product page). Lines already listed are skipped;
   * lines past MAX_ITEMS are dropped and reported through `full` / `skipped`.
   */
  addMany(inputs: AddInput[], opts?: { open?: boolean }) {
    hydrate();
    if (!inputs.length) {
      if (opts?.open) commit({ open: true }, false);
      return;
    }
    const listed = new Set(state.items.map((i) => i.key));
    const seen = new Set(listed);
    const items = [...state.items];
    const added: EnquiryItem[] = [];
    const existing: EnquiryItem[] = []; // inputs already in the list before this add
    const capped: EnquiryItem[] = []; // inputs dropped because the list is full
    for (const input of inputs) {
      const item = toItem(input);
      if (seen.has(item.key)) {
        // Count each pre-existing line once; repeats within this batch are simply merged.
        if (listed.has(item.key) && !existing.some((e) => e.key === item.key)) existing.push(item);
        continue;
      }
      seen.add(item.key);
      if (items.length >= MAX_ITEMS) {
        capped.push(item);
        continue;
      }
      items.push(item);
      added.push(item);
    }
    const full = capped.length > 0;
    const already = added.length === 0 && !full;
    const name = added.length
      ? describe(added, products)
      : full
        ? describe(capped, products)
        : describe(existing, (n) => `Each of these ${n} products`);
    commit({
      items: added.length ? items : state.items,
      open: opts?.open ?? state.open,
      flash: {
        id: ++flashId,
        name,
        already,
        keys: added.map((a) => a.key),
        full,
        skipped: capped.length,
        duplicates: existing.length,
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
