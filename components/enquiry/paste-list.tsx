"use client";

import {
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type Ref,
  type SetStateAction,
} from "react";
import { AlertCircle, Check } from "lucide-react";
import { useCatalogIndexState, type IndexItem } from "@/lib/catalog-index";
import { enquiryList, MAX_ITEMS, type AddInput } from "@/lib/enquiry-list";
import { customId, toAddInput } from "@/lib/enquiry-actions";
import { norm } from "@/lib/search-text";

/** A strength pulled from a pasted line: "12 mg" (with unit) or a bare "100". */
type Want = { value: string; bare: boolean };

type Parsed = {
  /** The pasted line, list marker stripped. */
  raw: string;
  /**
   * The line without its quantity; the name used for a custom request. A line that is only a
   * strength ("100 mg" in "Cenforce 50 mg, 100 mg") gets the product text of the line before it.
   */
  name: string;
  /** The product part of the line ("Cenforce"), for a strength-only line that follows it. */
  base: string;
  match: IndexItem | null;
  strength: string | null;
  /** Packs, when the line states them ("Cenforce 100 x 20", "Vidalista 20 - 50 boxes"). */
  qty?: number;
  want: Want | null;
  /** Equally good catalogue matches, best first (e.g. IVERHEAL tablets and IVERHEAL cream). */
  options: IndexItem[];
  /**
   * A catalogue name followed by words we can't read ("Cenforce Professional 100"): sent as a
   * custom request unless the buyer picks the suggested product.
   */
  loose: boolean;
};

const UNIT_RE = /(\d+(?:\.\d+)?)\s?(mg|mcg|µg|μg|g|ml|iu)\b/i;
/** A trailing bare number, on normalised text: "cenforce 100". */
const TRAILING_NUM_RE = /\s(\d+(?:\.\d+)?)$/;
/** A line that is only a strength: "100 mg", "100". */
const STRENGTH_ONLY_RE = /^\d+(?:\.\d+)?\s?(?:mg|mcg|µg|μg|g|ml|iu)?$/i;
/** The text left before a quantity ends in a strength: "Vidalista 20", "Iverheal 12 mg". */
const ENDS_IN_STRENGTH_RE = /\d\s?(?:mg|mcg|µg|μg|g|ml|iu)?$/i;
/** Real list markers only ("- ", "• ", "1. ", "2) "), so the "100 " of "100 mg" stays. */
const LIST_MARK_RE = /^\s*(?:[-*•·–—]+\s*|\(?\d{1,3}[.)]\s+)/;
/** "… qty 20", "… qty: 20 boxes" */
const QTY_WORD_RE = /(?:^|\s+)(?:qty|quantity|qnty)\.?\s*[:=-]?\s*(\d{1,6})\s*(?:packs?|box(?:es)?|strips?|units?)?\s*$/i;
/** "… (20 boxes)", "… (qty 20)", "… (x 20)", and "… 100 (20)" after a strength */
const QTY_PAREN_RE = /\s*\(\s*((?:qty|quantity|qnty)\.?\s*[:=-]?|[x×*])?\s*(\d{1,6})\s*(packs?|box(?:es)?|strips?|units?)?\s*\)\s*$/i;
/** "… x 20", "… × 20", "… *20", "… - 50 boxes", "… : 10 packs", and "x 20" on its own */
const QTY_SEP_RE = /(?:(?:^|\s+)[x×*]\s*|\s*[-–—:]\s+)(\d{1,6})\s*(packs?|box(?:es)?|strips?|units?)?\s*$/i;
/** "… 20 boxes", and "20 boxes" on its own */
const QTY_UNIT_RE = /(?:^|\s+)(\d{1,6})\s*(?:packs?|box(?:es)?|strips?|units?)\s*$/i;
/** "20 x Cenforce 100", "20 boxes of Cenforce 100" */
const LEAD_QTY_RE = /^(\d{1,6})\s*(?:[x×*]|(?:packs?|box(?:es)?|strips?|units?)(?:\s+of)?)\s+(?=\S)/i;
/** "20 Cenforce 100": a quantity, or list numbering when the lines count 1, 2, 3… */
const LEAD_BARE_RE = /^(\d{1,6})\s+(?=[a-z])(?!(?:mg|mcg|g|ml|iu|x|packs?|box(?:es)?|strips?|units?|of)\b)/i;
/** Trailing form words and pack formats ("tablets", "10x10") that don't name a product. */
const FORM_TAIL_RE = /\s+(?:tablets?|tabs?|caps|capsules?|pills?|softgels?)\.?$/i;
const PACK_TAIL_RE = /(\d(?:\s?(?:mg|mcg|µg|μg|g|ml|iu))?)\s+\d{1,3}[x×*]\d{1,3}$/i;
const NOISE_WORD_RE = /^(?:tablets?|tabs?|caps|capsules?|pills?|softgels?|each)$/;
/** A number word in normalised text, where units are glued on: "100mg", "2.5", "25μg", "1%". */
const NUM_WORD_RE = /^(\d+(?:\.\d+)?)(mg|mcg|µg|μg|g|ml|iu|%)?$/;
const MAX_QTY = 100000; // matches the enquiry-list store's clamp
const MAX_OPTIONS = 8;
const CUSTOM = "__custom__";

const squash = (s: string) => s.replace(/\s+/g, "").toLowerCase();
/** Leading number of a strength: "100 mg" / "100mg" -> "100"; "1% w/w" -> null. */
const leadNum = (s: string) => /^\s*(\d+(?:\.\d+)?)(?=\s|[a-zµ]|$)/i.exec(s)?.[1] ?? null;
const clamp = (n: number) => Math.min(MAX_QTY, Math.max(1, n));
/** "µg" / "μg" -> "mcg", the catalogue's spelling. */
const unitOf = (u: string) => (/^[µμ]g$/i.test(u) ? "mcg" : u.toLowerCase());
const tidy = (s: string) => s.replace(/[\s\-–—:*×]+$/, "").trim();

/**
 * Drop thousands separators from quantities ("x 2,500", "qty 1,000", "20 - 5,000",
 * "2,500 boxes"), so the comma split doesn't cut them in two. Other commas still separate
 * lines: "Cenforce 50,100" is two strengths.
 */
function glueThousands(text: string): string {
  const glue = (_: string, before: string, num: string) => before + num.replace(/,/g, "");
  return text
    .replace(
      /((?:^|[\s\d])[x×*]\s*|\b(?:qty|quantity|qnty)\.?\s*[:=-]?\s*|\d(?:\s?(?:mg|mcg|µg|μg|g|ml|iu))?(?:\s+[-–—]\s+|\s*:\s*))(\d{1,3}(?:,\d{3})+)(?!\d)/gim,
      glue,
    )
    .replace(/()\b(\d{1,3}(?:,\d{3})+)(?=\s*(?:packs?|box(?:es)?|strips?|units?)\b)/gi, glue);
}

/**
 * A trailing quantity, also before a form word ("x 20 tablets"). A separator, a unit word or
 * a "qty" label is required.
 */
function trailingQty(line: string): { name: string; qty: number } | null {
  return readTrailingQty(line) ?? readTrailingQty(line.replace(FORM_TAIL_RE, ""));
}

function readTrailingQty(line: string): { name: string; qty: number } | null {
  const cut = (m: RegExpExecArray, n: string) => ({ name: line.slice(0, m.index), qty: Number(n) });
  const before = (m: RegExpExecArray) => line.slice(0, m.index).trim();
  const word = QTY_WORD_RE.exec(line);
  if (word) return cut(word, word[1]);
  const par = QTY_PAREN_RE.exec(line);
  if (par && (par[1] || par[3] || ENDS_IN_STRENGTH_RE.test(before(par)))) return cut(par, par[2]);
  const sep = QTY_SEP_RE.exec(line);
  // "Cenforce - 100" is a strength, not 100 packs: a dash or colon without a unit word
  // only means quantity when a strength comes before it.
  if (sep && (sep[2] || /^\s*[x×*]/i.test(sep[0]) || ENDS_IN_STRENGTH_RE.test(before(sep)))) return cut(sep, sep[1]);
  const unit = QTY_UNIT_RE.exec(line);
  if (unit) return cut(unit, unit[1]);
  return null;
}

/**
 * Split a quantity off a line: trailing ("x 20", "- 50 boxes", "qty: 20", "(20 boxes)") or
 * leading ("20 x Cenforce 100"; a bare "20 Cenforce 100" only when `bareLead`). The name is
 * empty for a line that is only a quantity ("x 20").
 */
function splitQty(line: string, bareLead: boolean): { name: string; qty?: number; bare?: boolean } {
  const lead = LEAD_QTY_RE.exec(line);
  if (lead) {
    const rest = line.slice(lead[0].length);
    const tail = trailingQty(rest);
    return { name: tidy(tail ? tail.name : rest), qty: clamp(tail ? tail.qty : Number(lead[1])) };
  }
  const tail = trailingQty(line);
  if (tail) return { name: tidy(tail.name), qty: clamp(tail.qty) };
  const bare = bareLead ? LEAD_BARE_RE.exec(line) : null;
  if (bare) return { name: tidy(line.slice(bare[0].length)), qty: clamp(Number(bare[1])), bare: true };
  return { name: tidy(line) };
}

/** The product's own spelling of the wanted strength, if it offers it. */
function strengthOf(item: IndexItem, want: Want): string | null {
  const w = squash(want.value);
  // "1%" is the start of the catalogue's "1 % w/w (30 g)".
  const same = (s: string) => (w.endsWith("%") ? squash(s).startsWith(w) : squash(s) === w);
  return item.strengths.find((s) => (want.bare ? leadNum(s) === want.value : same(s))) ?? null;
}

/**
 * Strength for a line matched to `item`: its canonical spelling, else what was typed ("12 mg",
 * or a bare "300" the product doesn't list; no unit is assumed), else none.
 */
function resolveStrength(item: IndexItem | null, want: Want | null): string | null {
  if (!want) return null;
  return (item && strengthOf(item, want)) ?? want.value;
}

type Entry = { item: IndexItem; name: string; mol: string };
const prepared = new WeakMap<IndexItem[], Entry[]>();

/** Normalised names, computed once per loaded index. */
function prep(index: IndexItem[]): Entry[] {
  let entries = prepared.get(index);
  if (!entries) {
    entries = index.map((item) => ({ item, name: norm(item.name), mol: item.molecule ? norm(item.molecule) : "" }));
    prepared.set(index, entries);
  }
  return entries;
}

const TIERS: ((e: Entry, n: string) => boolean)[] = [
  (e, n) => e.name === n, // 0: exact name
  (e, n) => e.name.startsWith(n), // 1: name prefix
  (e, n) => !!e.mol && e.mol === n, // 2: exact molecule
  (e, n) => !!e.mol && e.mol.startsWith(n), // 3: molecule prefix
];

type Found = { tier: number; options: IndexItem[] };
type Hit = { want: Want | null; found: Found | null; base: string; qty?: number; loose?: boolean };

/**
 * All candidates at the first tier that matches, with the ones that offer the
 * wanted strength first ("Iverheal 12 mg" -> the tablets, not the cream).
 * `exact` skips the prefix tiers.
 */
function findProduct(entries: Entry[], needle: string, want: Want | null, exact = false): Found | null {
  const n = norm(needle);
  if (!n) return null;
  for (let tier = 0; tier < TIERS.length; tier++) {
    // Prefix tiers need two characters: a lone "x" (from "x 20") is not the start of "XYANDROL".
    if (tier % 2 === 1 && (exact || n.length < 2)) continue;
    const hits = entries.filter((e) => TIERS[tier](e, n)).map((e) => e.item);
    if (!hits.length) continue;
    const fits = want ? hits.filter((h) => strengthOf(h, want)) : [];
    return { tier, options: fits.length ? [...fits, ...hits.filter((h) => !fits.includes(h))] : hits };
  }
  return null;
}

/** Normalised text, then (as a fallback) with letters and digits unglued: "cenforce100" -> "cenforce 100". */
function variants(s: string): string[] {
  const n = norm(s);
  const split = n.replace(/([a-z])(\d)/g, "$1 $2");
  return split === n ? [n] : [n, split];
}

/** The typed text without its trailing number: "Cenforce-100" -> "Cenforce". */
const dropTrailingNum = (s: string) => s.replace(/[\s\-–—_]*\d+(?:\.\d+)?\W*$/, "").trim() || s;

/** Without trailing form words and pack formats: "Cenforce 100 mg 10x10 tablets" -> "Cenforce 100 mg". */
function stripForm(s: string): string {
  for (let prev = ""; prev !== s; ) {
    prev = s;
    s = s.replace(FORM_TAIL_RE, "").replace(PACK_TAIL_RE, "$1").trim();
  }
  return s;
}

/**
 * The longest run of leading words that is exactly a product or molecule name, with the
 * words after it read as a strength and then a quantity ("Cenforce 300", "Cenforce 100 20").
 * Any other word left over makes the product only a suggestion.
 */
function leadingRun(entries: Entry[], text: string, want0: Want | null): Hit | null {
  for (const n of variants(text)) {
    const words = n.split(" ");
    for (let k = words.length - 1; k >= 1; k--) {
      const head = words.slice(0, k).join(" ");
      if (!findProduct(entries, head, null, true)) continue;
      let want = want0;
      let qty: number | undefined;
      let loose = false;
      for (const w of words.slice(k)) {
        const num = NUM_WORD_RE.exec(w);
        if (num && !want) want = num[2] ? { value: `${num[1]} ${unitOf(num[2])}`, bare: false } : { value: num[1], bare: true };
        else if (num && !num[2] && qty === undefined && /^\d{1,6}$/.test(w)) qty = clamp(Number(w));
        else if (!NOISE_WORD_RE.test(w)) loose = true;
      }
      return { want, found: findProduct(entries, head, want, true), base: head, qty, loose };
    }
  }
  return null;
}

/** Match one line, its quantity already removed, to the catalogue. */
function matchName(entries: Entry[], name: string): Hit {
  const core = stripForm(name) || name;
  // 1) explicit unit: "Iverheal 12 mg"
  const unit = UNIT_RE.exec(core);
  if (unit) {
    const want = { value: `${unit[1]} ${unitOf(unit[2])}`, bare: false };
    const rest = core.replace(unit[0], " ").replace(/\s+/g, " ").trim();
    const found = findProduct(entries, rest, want);
    if (found) return { want, found, base: rest };
    return leadingRun(entries, rest, want) ?? { want, found: null, base: rest };
  }
  // 2) the whole line is a product name: "Cenforce D", "DECA-250", "Zunestar Tablets"
  for (const s of name === core ? [name] : [name, core]) {
    const whole = findProduct(entries, s, null);
    if (whole?.tier === 0) return { want: null, found: whole, base: s };
  }
  // 3) a trailing number, also hyphenated or glued: "Cenforce 100", "Cenforce-100", "Cenforce100".
  //    Ungluing comes after the exact-name check, so names with digits ("T3BIX") still match.
  for (const n of variants(core)) {
    const tail = TRAILING_NUM_RE.exec(n);
    if (!tail) continue;
    const want = { value: tail[1], bare: true };
    const found = findProduct(entries, n.slice(0, tail.index), want);
    if (found) return { want, found, base: dropTrailingNum(core) };
  }
  // 4) the start of a product name, or a molecule: "Cenforce So", "Tadalafil"
  const prefix = findProduct(entries, core, null);
  if (prefix) return { want: null, found: prefix, base: core };
  // 5) a product name followed by more words: "Cenforce 100 20", "Cenforce Professional 100"
  return leadingRun(entries, core, null) ?? { want: null, found: null, base: dropTrailingNum(core) };
}

function readLine(entries: Entry[], raw: string, split: { name: string; qty?: number }, prev?: Parsed): Parsed {
  let name = split.name || raw;
  const qty = split.name ? split.qty : undefined;
  // A strength on its own ("Cenforce 50 mg, 100 mg") is another strength of the product before it.
  if (prev?.base && STRENGTH_ONLY_RE.test(name)) name = `${prev.base} ${name}`;
  const hit = matchName(entries, name);
  const options = hit.found?.options.slice(0, MAX_OPTIONS) ?? [];
  const loose = !!hit.loose && options.length > 0;
  const match = loose ? null : options[0] ?? null;
  return {
    raw,
    name,
    base: hit.base,
    qty: qty ?? hit.qty,
    want: hit.want,
    match,
    strength: resolveStrength(match, hit.want),
    options,
    loose,
  };
}

/**
 * Split on newlines / commas / semicolons, then match each line to the catalogue.
 * Lines it must read (keep them as parser tests): "Kamagra 100mg x 2,500", "Cenforce 100 x 1,000",
 * "Vidalista 20 - 5,000 boxes", "Cenforce 50 mg, 100 mg", "Cenforce 50,100", "Tadalafil 20mg, 40mg",
 * "Cenforce-100", "Vidalista-20 - 500 boxes", "Cenforce100", "Cenforce 100 tablets",
 * "Cenforce 100 (20 boxes)", "Cenforce 100 qty 20", "Vidalista 20 qty: 50", "20 x Cenforce 100",
 * "Cenforce 100 mg 10x10", and "Cenforce 300" (kept as "300", shown as not listed).
 */
export function parsePaste(text: string, index: IndexItem[]): Parsed[] {
  const entries = prep(index);
  const frags = glueThousands(text)
    .split(/[\n,;]+/)
    .map((s) => s.replace(LIST_MARK_RE, "").replace(/[\s.!?]+$/, "").trim())
    .filter(Boolean)
    .slice(0, 100);
  // Leading numbers that count 1, 2, 3… are list numbering; otherwise they are quantities.
  const leads = frags.map((f) => LEAD_BARE_RE.exec(f)?.[1]).filter((n): n is string => !!n);
  const numbered = leads.length > 0 && leads.every((n, i) => Number(n) === i + 1);
  const out: Parsed[] = [];
  for (const frag of frags) {
    const raw = numbered ? frag.replace(LEAD_BARE_RE, "") : frag;
    const prev = out[out.length - 1];
    const split = splitQty(raw, !numbered);
    // A quantity on its own ("Cenforce 100, x 20") belongs to the line before it.
    if (!split.name && split.qty && prev && prev.qty === undefined) {
      prev.qty = split.qty;
      continue;
    }
    let line = readLine(entries, raw, split, prev);
    // "2 in 1 kit": a bare leading number is only a quantity when the rest is in the catalogue.
    if (split.bare && !line.options.length) line = readLine(entries, raw, splitQty(raw, false), prev);
    out.push(line);
  }
  return out;
}

function toInput(p: Parsed): AddInput {
  if (p.match) return toAddInput(p.match, p.strength, p.qty);
  return {
    medicineId: customId(p.name),
    name: p.name,
    molecule: null,
    form: null,
    strengths: [],
    strength: null,
    image: null,
    qty: p.qty,
  };
}

const packs = (qty?: number) => (qty ? ` · ${qty} pack${qty === 1 ? "" : "s"}` : "");
const describe = (i: IndexItem) => [i.molecule, i.form].filter(Boolean).join(" · ");
/** The strength was kept as typed ("300") because the product doesn't list it. */
const offList = (p: Parsed) => !!p.match && !!p.strength && !p.match.strengths.includes(p.strength);

/**
 * What the drawer can call through `handleRef`: add every previewed line, returning how many
 * new lines the list took (lines already listed, or cut by the list cap, are not counted).
 */
export type PasteListHandle = { add: () => number };

/**
 * What one Add did: lines added (`custom` of them as custom requests), lines already listed
 * that took the pasted packs, other lines already listed, and lines cut by the cap.
 */
export type Added = { n: number; custom: number; updated: number; dup: number; cut: number };

const lineCount = (k: number) => `${k} line${k === 1 ? "" : "s"}`;

/**
 * "1 line updated to the packs you pasted", for the visible note. Screen readers hear it from
 * the store's flash (flash.updated), which EnquiryToast announces through LiveRegion.
 */
const updatedNote = (updated: number) => `${lineCount(updated)} updated to the packs you pasted`;

/**
 * Add pasted lines to the enquiry list and report what it took. Unlike a card or row add, a
 * pasted line can state its packs ("Cenforce 100 x 50"). When such a line is already listed
 * (the same product and strength, or no strength for a product listed on one line), that line
 * takes the pasted packs, replacing its old count, as the product page does. Lines with no
 * packs leave a listed line as it is.
 *
 * The cap count is the store's own result for this add (addMany sets its flash synchronously),
 * so a line the store skips as already listed is never reported as cut by the list cap.
 */
export function addPasted(inputs: AddInput[]): Added {
  if (!inputs.length) return { n: 0, custom: 0, updated: 0, dup: 0, cut: 0 };
  const had = new Set(enquiryList.getSnapshot().items.map((i) => i.key));
  // applyQty: pasted packs also update lines already listed (first pasted line per line wins;
  // a line with no strength only updates a product still on exactly one line). The store
  // reports those in flash.updated, so the toast and this note agree.
  enquiryList.addMany(inputs, { applyQty: true });
  const { items, flash } = enquiryList.getSnapshot();
  const cut = flash?.skipped ?? 0;
  const updated = flash?.updated ?? 0;
  const fresh = items.filter((i) => !had.has(i.key));

  return {
    n: fresh.length,
    custom: fresh.filter((i) => i.medicineId.startsWith("custom:")).length,
    updated,
    // Neither new, updated nor cut: already listed (or a repeat of a line earlier in the box).
    dup: Math.max(0, inputs.length - fresh.length - updated - cut),
    cut,
  };
}

/**
 * The visible note after an Add, from what the list actually took: "3 lines added to your
 * list", "2 lines added · 2 already in your list", "1 line updated to the packs you pasted",
 * "All 4 lines are already in your list".
 */
export function addedNote({ n, custom, updated, dup, cut }: Added): string {
  const listed = dup ? `${dup} already in your list` : "";
  if (!n) {
    const also = [updated ? updatedNote(updated) : "", listed].filter(Boolean).join(" · ");
    if (cut) {
      return `Your list is full (${MAX_ITEMS} lines), so ${lineCount(cut)} ${cut === 1 ? "was" : "were"} not added${
        also ? ` · ${also}` : ""
      }.`;
    }
    if (updated) return `${also}.`;
    return dup === 1 ? "This line is already in your list." : `All ${dup} lines are already in your list.`;
  }
  const asCustom = custom ? ` (${custom} as ${custom === 1 ? "a custom request" : "custom requests"})` : "";
  const rest = [
    updated ? `${updated} updated to the packs you pasted` : "",
    listed,
    cut ? `list full, ${cut} not added` : "",
  ].filter(Boolean);
  return `${[`${lineCount(n)} added${rest.length ? "" : " to your list"}${asCustom}`, ...rest].join(" · ")}.`;
}

/**
 * The text and choices are owned by the drawer (so unadded lines survive step changes and
 * reopening). `picks` is the buyer's choice for an ambiguous or suggested line, keyed by the
 * line's name (so two "100 mg" lines under different products stay apart): a product id or CUSTOM.
 */
export function PasteList({
  open,
  onToggle,
  text,
  onText,
  picks,
  onPicks,
  onPending,
  handleRef,
}: {
  open: boolean;
  onToggle: (open: boolean) => void;
  text: string;
  onText: (text: string) => void;
  picks: Record<string, string>;
  onPicks: Dispatch<SetStateAction<Record<string, string>>>;
  onPending?: (count: number) => void;
  handleRef?: Ref<PasteListHandle>;
}) {
  const id = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  /** The last Add, for the status line; cleared as soon as the buyer types again. */
  const [added, setAdded] = useState<Added | null>(null);
  // Lines are only classified against a loaded index: while it is loading or
  // unavailable nothing is parsed, so nothing is wrongly sent as a custom request.
  const { index, status, retry } = useCatalogIndexState(open || text.length > 0);
  const parsed = useMemo(() => (index ? parsePaste(text, index) : []), [text, index]);
  const lines = useMemo(
    () =>
      parsed.map((p): Parsed => {
        const pick = picks[p.name];
        if (!pick || !p.options.length) return p;
        if (pick === CUSTOM) return { ...p, match: null, strength: null };
        const item = p.options.find((o) => o.id === pick);
        return item ? { ...p, match: item, strength: resolveStrength(item, p.want) } : p;
      }),
    [parsed, picks],
  );
  const matched = lines.filter((p) => p.match).length;

  // Tell the drawer how many previewed lines are not yet in the list.
  useEffect(() => {
    onPending?.(status === "ready" ? lines.length : 0);
  }, [status, lines.length, onPending]);

  /**
   * Add every previewed line; does not move focus (the drawer calls it too). Returns how many
   * new lines the list took. The store's flash, announced by EnquiryToast through LiveRegion,
   * covers the added, already-listed and updated lines (and any cut by the cap), so the note
   * set here is visible text only.
   */
  const addLines = (): number => {
    if (status !== "ready" || !lines.length) return 0;
    const result = addPasted(lines.map(toInput));
    onText("");
    onPicks({});
    setAdded(result);
    return result.n;
  };

  // No deps: the handle always sees the current lines.
  useImperativeHandle(handleRef, () => ({ add: addLines }));

  // The button unmounts as the retry starts loading; keep focus in the paste box.
  const tryAgain = () => {
    textRef.current?.focus();
    retry();
  };

  return (
    <details
      className="filter-group"
      open={open}
      onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>Paste a list</summary>
      <div className="filter-group-body">
        <label className="label" htmlFor={`${id}-t`}>
          Your product list
        </label>
        <textarea
          ref={textRef}
          id={`${id}-t`}
          className="textarea"
          rows={5}
          placeholder={"One product per line or separated by commas, e.g.\nCenforce 100 x 20\nIverheal 12 mg\nVidalista 20"}
          value={text}
          onChange={(e) => {
            onText(e.target.value);
            setAdded(null);
          }}
          aria-describedby={`${id}-h`}
        />
        <p className="field-help" id={`${id}-h`}>
          We match each line to the catalogue. Add a quantity with &ldquo;x 20&rdquo; or &ldquo;20 boxes&rdquo;.
          Anything we can&rsquo;t find is sent as a custom request.
        </p>

        {/* Always rendered, so the catalogue error is announced when it appears. The result
            of an Add is not announced here: the store's flash already says it. */}
        <div role="status">
          {status === "error" && (
            <p className="mt-4 flex items-start gap-2 text-sm">
              <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 flex-none text-fg-muted" />
              We can&rsquo;t check the catalogue right now.
            </p>
          )}
        </div>
        {status === "error" && (
          <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={tryAgain}>
            Try again
          </button>
        )}
        {status === "loading" && text.trim() !== "" && (
          <p className="mt-4 text-sm text-fg-muted">Checking the catalogue…</p>
        )}

        {/* In normal flow right under the box: never over the text being typed, and not
            below a long preview. */}
        <div className="mt-4">
          <button
            type="button"
            className="btn btn-enquire"
            disabled={status !== "ready" || !lines.length}
            onClick={() => {
              addLines();
              // The focused Add button is disabled once the box is empty, which would
              // drop focus to <body> inside the modal drawer.
              textRef.current?.focus();
            }}
          >
            Add {lines.length || ""} line{lines.length === 1 ? "" : "s"}
          </button>
        </div>
        {/* Visible text only: the store's flash, announced by EnquiryToast through LiveRegion,
            already covers the added, already-listed and updated lines. */}
        {added && <p className="mt-3 text-sm text-fg-strong">{addedNote(added)}</p>}

        {lines.length > 0 && (
          <>
            <p className="mt-4 text-sm font-semibold text-fg-strong">
              {matched} of {lines.length} matched
            </p>
            <ul className="mt-2 space-y-3">
              {lines.map((p, i) => (
                <li key={`${i}-${p.raw}`} className="flex items-start gap-2 text-sm">
                  {p.match ? (
                    <Check aria-hidden className="mt-0.5 h-4 w-4 flex-none text-leaf-700" />
                  ) : (
                    <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 flex-none text-fg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    {p.match ? (
                      <>
                        <p>
                          <b className="text-fg-strong">{p.match.name}</b>
                          {p.strength ? ` · ${p.strength}` : ""}
                          {offList(p) && <span className="text-fg-muted"> (not a listed strength)</span>}
                          {packs(p.qty)}
                        </p>
                        {describe(p.match) && <p className="text-fg-muted">{describe(p.match)}</p>}
                      </>
                    ) : (
                      <p>
                        <b className="text-fg-strong">“{p.name}”</b>
                        {packs(p.qty)} —{" "}
                        {p.options.length
                          ? "sent as a custom request unless you choose a product below"
                          : "not in catalogue, sent as a custom request"}
                      </p>
                    )}
                    {(p.options.length > 1 || p.loose) && (
                      <select
                        className="select mt-2"
                        aria-label={`Product for “${p.name}”`}
                        value={p.match?.id ?? CUSTOM}
                        onChange={(e) => {
                          const v = e.target.value;
                          onPicks((prev) => ({ ...prev, [p.name]: v }));
                        }}
                      >
                        {p.options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {[o.name, describe(o)].filter(Boolean).join(" — ")}
                          </option>
                        ))}
                        <option value={CUSTOM}>None of these: send as a custom request</option>
                      </select>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </details>
  );
}
