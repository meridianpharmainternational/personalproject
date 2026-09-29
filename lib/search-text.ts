/**
 * Search text normalisation shared by the /medicines catalogue, the header,
 * sheet and drawer search, and Paste-a-list, so they all agree on what
 * matches. Pure (no imports), so it is safe on both the client and the server.
 */

/**
 * Lower-case, strip accents and punctuation, and glue numbers to their units so
 * "100mg", "100 mg" and "100-mg" all match. NFKD turns the micro sign (U+00B5)
 * into Greek mu (U+03BC), so "µg" is matched in either spelling.
 * A word of 3+ letters typed straight into a number is split from it, so
 * "cenforce100" and "vidalista20" search as "cenforce 100" and "vidalista 20".
 * No catalogue text has that pattern, so in practice this only changes queries
 * (and both sides go through norm, so they still agree if one ever does).
 */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[-_,;:()[\]'"“”‘’]+/g, " ")
    .replace(/([a-z]{3,})(?=\d)/g, "$1 ")
    .replace(/(\d)\s+(?=(?:mcg|[µμ]g|mg|g|ml|iu|%)(?![a-z]))/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Buyer abbreviations for dosage forms, searched as the catalogue's word.
 * "tabs" and "amps" are not substrings of "tablets" / "ampoule". "tab" is, but
 * on its own it also hits "injecTABles", so it is mapped too. "caps" and "inj"
 * already match "capsules" / "injection" as substrings; "caps" is listed so it
 * cannot hit anything else. A Map, so tokens like "constructor" are safe.
 */
const ALIASES = new Map<string, string>([
  ["tab", "tablet"],
  ["tabs", "tablet"],
  ["caps", "capsule"],
  ["amps", "ampoule"],
]);

/**
 * Normalised search tokens. Single letters are dropped (single digits are
 * kept), so "Cenforce D" doesn't also match everything that contains a "d".
 * Form abbreviations ("tabs", "caps", "amps") become the catalogue's word.
 * An empty list means "no query": a lone letter filters nothing, and callers
 * must not report "0 results" for it.
 */
export const tokenize = (q: string): string[] =>
  norm(q)
    .split(" ")
    .filter((t) => t.length > 1 || /\d/.test(t))
    .map((t) => ALIASES.get(t) ?? t);

/* ------------------------------------------------- spelling tolerance */

/** Only all-letter words of 7+ characters are shortened (never numbers or doses). */
const RELAXABLE = /^[a-z]{7,}$/;
/** At most this many trailing letters are dropped from a word. */
const MAX_CUT = 2;

/**
 * Does typed token `t` spell catalogue word `w`, allowing up to MAX_CUT extra
 * trailing letters on a long word ("ivermectine" / "sildenafilo" / "modafinill")?
 */
const spells = (t: string, w: string): boolean =>
  t === w || (RELAXABLE.test(t) && t.length - w.length <= MAX_CUT && t.length > w.length && t.startsWith(w));

export type Relaxed = {
  /** Tokens to search with: the typed ones, with each unmatched long word shortened. */
  tokens: string[];
  /** Each word that was shortened, as typed (normalised) and as searched. */
  changes: { from: string; to: string }[];
  /**
   * The query actually searched, for the label 'Showing results for “ivermectin”'.
   * Always show it when a Relaxed result is used: never correct silently.
   */
  query: string;
};

/**
 * Fallback for a search that matches nothing. Every all-letter token of 7+
 * characters that appears in no haystack loses its last letter, then its last
 * two, until it appears somewhere ("ivermectine" → "ivermectin", "tadalafilo" →
 * "tadalafil", "injections" → "injection"); then the AND search is retried.
 *
 * `hays` are normalised haystacks (norm()), one per product, e.g. the
 * catalogue's universe.hay.values() or the header index rows' hay. Returns null
 * when the tokens already match something, when no word could be shortened, or
 * when the shortened search still matches nothing: in those cases search with
 * the tokens as typed (and only then offer the custom request).
 */
export function relaxTokens(tokens: readonly string[], hays: Iterable<string>): Relaxed | null {
  if (!tokens.length) return null;
  const list = Array.isArray(hays) ? (hays as readonly string[]) : [...hays];
  const anyHas = (t: string) => list.some((h) => h.includes(t));
  const allIn = (ts: readonly string[]) => list.some((h) => ts.every((t) => h.includes(t)));
  if (allIn(tokens)) return null;

  // Pass 1 shortens each unmatched word as little as possible; if the words
  // then don't all meet in one product, pass 2 retries with two letters off.
  for (let first = 1; first <= MAX_CUT; first++) {
    const changes: { from: string; to: string }[] = [];
    const next = tokens.map((t) => {
      if (!RELAXABLE.test(t) || anyHas(t)) return t;
      for (let cut = first; cut <= MAX_CUT; cut++) {
        const c = t.slice(0, -cut);
        if (anyHas(c)) {
          changes.push({ from: t, to: c });
          return c;
        }
      }
      return t;
    });
    if (!changes.length) return null;
    if (allIn(next)) return { tokens: next, changes, query: next.join(" ") };
  }
  return null;
}

/**
 * Empty-state "Did you mean Ivermectin (13)?": the first option (e.g. a
 * molecule, in the caller's order) whose name the query spells with a
 * corrected word: "ivermectine" → Ivermectin, "sildenafilo citrate" →
 * Sildenafil Citrate. Names are compared word by word via tokenize(), so
 * punctuation and "+" don't matter. An option typed exactly is not returned
 * (there is nothing to correct). Null when none fits.
 */
export function didYouMean<T>(tokens: readonly string[], options: readonly T[], name: (o: T) => string): T | null {
  if (!tokens.length) return null;
  for (const o of options) {
    const words = tokenize(name(o));
    if (!words.length || words.length > tokens.length) continue;
    for (let i = 0; i + words.length <= tokens.length; i++) {
      const run = tokens.slice(i, i + words.length);
      if (run.every((t, j) => spells(t, words[j])) && run.some((t, j) => t !== words[j])) return o;
    }
  }
  return null;
}
