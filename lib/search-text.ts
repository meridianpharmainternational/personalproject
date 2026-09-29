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

/* ------------------------------------------------------ token matching */

/** A token that starts with a number: a dose ("20mg", "2.5mg", "1%") or a bare number ("20"). */
const NUMERIC_START = /^\d/;
/** What a numeric token must not follow: another digit ("20" in "120") or a decimal point ("5" in "2.5"). */
const NUM_BEFORE = /[\d.]/;
/** What a token ending in a digit must not run into: more digits ("20" in "200") or a decimal part ("2" in "2.5"). */
const NUM_AFTER = /^\.?\d/;

/**
 * Does normalised haystack `hay` contain search token `t`? The one test every
 * search surface uses (catalogue field, header panel, mobile sheet, drawer
 * search and the relaxTokens fallback), so they all agree.
 *
 * - A token that starts with a letter is a plain substring, so partial typing
 *   still finds things ("sild" → Sildenafil, "mectin" → Ivermectin).
 * - A token that starts with a digit must start a number: it may not follow a
 *   digit or a decimal point, so "20mg" does not match "120mg", and "5mg" does
 *   not match "2.5mg", "7.5mg" or "25mg". If it also ends in a digit, the number
 *   must end there too, so "20" does not match "200" and "2" does not match "2.5".
 *   "20" still matches "20mg" and "cenforce 20".
 *
 * Both sides must be norm()'d (tokenize() output against a norm()'d haystack).
 */
export function hasToken(hay: string, t: string): boolean {
  if (!NUMERIC_START.test(t)) return hay.includes(t);
  const closed = /\d$/.test(t);
  for (let i = hay.indexOf(t); i >= 0; i = hay.indexOf(t, i + 1)) {
    if (i > 0 && NUM_BEFORE.test(hay[i - 1])) continue;
    if (closed && NUM_AFTER.test(hay.slice(i + t.length, i + t.length + 2))) continue;
    return true;
  }
  return false;
}

/** Does `hay` contain every token (hasToken)? No tokens means no query, so it matches. */
export const hasAllTokens = (hay: string, tokens: readonly string[]): boolean =>
  tokens.every((t) => hasToken(hay, t));

/* ------------------------------------------------------------ ranking */

/** A norm()'d text that starts with a one-letter word ("d 100mg", "c"): a variant letter, never a dose or form. */
const LONE_LETTER = /^[a-z](?: |$)/;

/**
 * Search relevance tier for one matching product; lower is better.
 * - 0: the whole query is the exact name.
 * - 1: the name starts with the whole query, or the whole query is the full
 *   name followed by more words (a dose, form or ester: "oxandrol 10mg",
 *   "TEST-C 250mg"), unless the next word is a lone letter: that letter names
 *   a variant ("cenforce d 100mg" is Cenforce-D, so it does not lift Cenforce).
 * - 2: the name starts with the tokens.
 * - 3: the molecule starts with the tokens, or (for a query of 2+ tokens)
 *   with the first token.
 * - 4: a word in the name starts with the first token.
 * - 5: anything else.
 *
 * The first-token molecule test keeps a molecule ahead of look-alikes when the
 * buyer adds a form or a dose: "modafinil tablets" and "sildenafil 100mg" put
 * Modafinil / Sildenafil products at 3, while Armodafinil (which only contains
 * "modafinil") stays at 5. The full-name-plus-more test at 1 keeps a brand
 * typed with its dose ahead of that rule when the brand is also the start of
 * its molecule: "oxandrol 10mg" puts OXANDROL (1) above ANAVAR (Oxandrolone,
 * 3), and "TEST-C 250mg" puts TEST-C (1) above TEST-E (Testosterone, 3).
 * A single-token query ranks exactly as before.
 * Callers break ties by catalogue order (sort_order), not by name.
 *
 * `nameNorm`, `molNorm` and `whole` are norm()'d; `tokens` is tokenize()
 * output. `whole` is the query as typed, single letters included, so "TEST-C"
 * ranks the product TEST-C above TEST-E although tokenize() drops the "c".
 */
export function relevanceScore(nameNorm: string, molNorm: string, tokens: readonly string[], whole: string): number {
  const q = tokens.join(" ");
  if (nameNorm === whole) return 0;
  if (nameNorm.startsWith(whole)) return 1;
  if (whole.startsWith(`${nameNorm} `) && !LONE_LETTER.test(whole.slice(nameNorm.length + 1))) return 1;
  if (nameNorm.startsWith(q)) return 2;
  if (molNorm.startsWith(q) || (tokens.length > 1 && molNorm.startsWith(tokens[0]))) return 3;
  if (tokens.length && nameNorm.split(" ").some((w) => w.startsWith(tokens[0]))) return 4;
  return 5;
}

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

/**
 * Innovator and well-known brand names buyers type for a molecule the
 * catalogue lists under its INN, plus other spellings of a listed INN. Used
 * only by relaxTokens, only for a token that appears in no haystack (so a brand
 * the catalogue sells under that name, such as "Viagra" or "Proviron", is still
 * found as typed), and only when the result then matches (so an entry for a
 * molecule that is not listed finds nothing and changes nothing). Each value is
 * tried in order and the first one some product has is used. Keys and values
 * are tokenize() output. A Map, so tokens like "constructor" are safe.
 */
const SYNONYMS = new Map<string, readonly string[]>([
  ["albenza", ["albendazole"]],
  ["zentel", ["albendazole"]],
  ["arimidex", ["anastrozole"]],
  ["nuvigil", ["armodafinil"]],
  ["waklert", ["armodafinil"]],
  ["stendra", ["avanafil"]],
  ["spedra", ["avanafil"]],
  ["equipoise", ["boldenone"]],
  ["spiropent", ["clenbuterol"]],
  ["masteron", ["drostanolone"]],
  ["dromostanolone", ["drostanolone"]],
  ["avodart", ["dutasteride"]],
  ["lunesta", ["eszopiclone"]],
  ["panacur", ["fenbendazole"]],
  ["propecia", ["finasteride"]],
  ["proscar", ["finasteride"]],
  // The source data spelt this molecule "Fluoxymesterolone"; the catalogue now uses the INN.
  ["halotestin", ["fluoxymesterone"]],
  ["fluoxymesterolone", ["fluoxymesterone"]],
  ["neurontin", ["gabapentin"]],
  ["accutane", ["isotretinoin"]],
  ["roaccutane", ["isotretinoin"]],
  ["stromectol", ["ivermectin"]],
  ["carnitor", ["levocarnitine"]],
  ["cytomel", ["liothyronine"]],
  ["vermox", ["mebendazole"]],
  ["circadin", ["melatonin"]],
  ["proviron", ["mesterolone"]],
  ["dianabol", ["methandienone"]],
  ["metandienone", ["methandienone"]],
  ["methandrostenolone", ["methandienone"]],
  ["primobolan", ["methenolone"]],
  ["metenolone", ["methenolone"]],
  ["rogaine", ["minoxidil"]],
  ["regaine", ["minoxidil"]],
  ["provigil", ["modafinil"]],
  ["modalert", ["modafinil"]],
  ["durabolin", ["nandrolone"]],
  ["anavar", ["oxandrolone"]],
  ["anadrol", ["oxymetholone"]],
  ["lyrica", ["pregabalin"]],
  ["viagra", ["sildenafil"]],
  ["revatio", ["sildenafil"]],
  ["winstrol", ["stanozolol"]],
  ["cialis", ["tadalafil"]],
  ["adcirca", ["tadalafil"]],
  ["nucynta", ["tapentadol"]],
  ["palexia", ["tapentadol"]],
  ["sustanon", ["testosterone"]],
  ["nebido", ["testosterone"]],
  ["androgel", ["testosterone"]],
  ["testogel", ["testosterone"]],
  ["parabolan", ["trenbolone"]],
  ["finaplix", ["trenbolone"]],
  ["zydena", ["udenafil"]],
  ["levitra", ["vardenafil"]],
  ["staxyn", ["vardenafil"]],
  ["imovane", ["zopiclone"]],
  ["zimovane", ["zopiclone"]],
  ["priligy", ["dapoxetine"]],
  // INN spellings of the esters the catalogue records (see esterWord).
  ["cipionate", ["cypionate"]],
  ["enantate", ["enanthate"]],
  ["heptanoate", ["enanthate"]],
]);

/**
 * Salt words that never tell two listed products apart: dropped whenever the
 * search as typed matches nothing ("sertraline hydrochloride" → "sertraline").
 */
const SALTS_ALWAYS = new Set(["hydrochloride", "hcl", "hydrobromide", "hbr"]);

/**
 * Esters and named salts, dropped only when no product carries the word
 * ("testosterone enanthate" → "testosterone" while no product lists its
 * ester). Once a product does ("Nandrolone Decanoate"), the word tells products
 * apart and is kept, so a combination nobody lists stays empty and the buyer is
 * offered the custom request.
 */
const SALTS_IF_ABSENT = new Set([
  "acetate",
  "caproate",
  "cipionate",
  "cypionate",
  "decanoate",
  "enantate",
  "enanthate",
  "heptanoate",
  "hexahydrobenzylcarbonate",
  "isocaproate",
  "laurate",
  "phenylpropionate",
  "propionate",
  "undecanoate",
  "undecylenate",
  "besylate",
  "citrate",
  "fumarate",
  "maleate",
  "mesylate",
  "phosphate",
  "succinate",
  "sulfate",
  "sulphate",
  "tartrate",
]);

/**
 * The ester or salt a product's description names, for its search text. The
 * catalogue stores injectables under the base molecule ("Testosterone") and
 * records the ester only in medicines.description ("Enanthate"), so without it
 * "testosterone enanthate" finds nothing. Returns the norm()'d word when the
 * whole description is one ester or salt word ("Enanthate" → "enanthate"),
 * else null, so long free-text descriptions never enter search.
 * Append the result to the haystack in the same position in buildUniverse()
 * (components/catalog/catalog-model.ts) and prepare() (lib/catalog-index.ts).
 */
export function esterWord(description: string | null | undefined): string | null {
  const w = norm(description ?? "");
  return SALTS_IF_ABSENT.has(w) ? w : null;
}

/**
 * Words buyers use for a whole category that its display name doesn't contain ("steroids",
 * "painkillers", "sleeping pills", "hair loss"). Searched, never shown. Keyed by category slug
 * (the slugs keep the source site's names), so the fixed display names stay as they are.
 * Plural forms, so the singular ("steroid", "painkiller") also matches as a substring.
 * Append the result right after the category name in buildUniverse() and prepare(), and to the
 * header's category row text, so every search surface agrees.
 */
const CATEGORY_TERMS = new Map<string, string>([
  ["ed-medicines", "erectile dysfunction"],
  ["anti-parasitic", "antiparasitic"],
  ["painkillers", "painkillers"],
  ["sleeping-pills", "sleeping pills"],
  ["sleep-alert", "nootropics"],
  ["hair-loss", "hair loss"],
  ["steroid-injections", "steroids anabolic"],
  ["steroid-tablets", "steroids anabolic"],
]);

/** Extra search words for a category (see CATEGORY_TERMS); "" for none. */
export const categoryTerms = (slug: string | null | undefined): string => (slug && CATEGORY_TERMS.get(slug)) || "";

/**
 * Is `a` one edit from `b`: one letter wrong, missing or extra, or two neighbouring letters
 * swapped ("anastrazole" / "anastrozole", "tadalfil" / "tadalafil", "isotretinion" /
 * "isotretinoin")? Equal words are not.
 */
export function oneEdit(a: string, b: string): boolean {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) {
    return (
      a.slice(i + 1) === b.slice(i + 1) ||
      (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2))
    );
  }
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

export type Relaxed = {
  /**
   * Tokens to search with: the typed ones, with each unmatched long word
   * shortened, each brand name replaced by its molecule and each unmatched salt
   * word dropped. Never empty.
   */
  tokens: string[];
  /**
   * Each word that was changed, as typed (normalised) and as searched. `to` is
   * "" for a salt word that was dropped.
   */
  changes: { from: string; to: string }[];
  /**
   * The query actually searched, for the label 'Showing results for “ivermectin”'.
   * Always show it when a Relaxed result is used: never correct silently.
   */
  query: string;
};

/**
 * Fallback for a search that matches nothing. Each token is rewritten, then
 * the AND search is retried:
 * - a brand name that appears in no haystack becomes its molecule ("cialis" →
 *   "tadalafil", "arimidex" → "anastrozole"; see SYNONYMS);
 * - a salt word is dropped ("hydrochloride", "hcl"), and so is an ester or
 *   named salt that no product carries ("testosterone enanthate" →
 *   "testosterone");
 * - an all-letter word of 7+ characters that appears in no haystack loses its
 *   last letter, then its last two, until it appears somewhere ("ivermectine" →
 *   "ivermectin", "tadalafilo" → "tadalafil", "injections" → "injection");
 * - failing that, it becomes the one catalogue word of 7+ letters that is a
 *   single edit away (oneEdit: "anastrazole" → "anastrozole", "tadalfil" →
 *   "tadalafil"). With two or more such words the typo is ambiguous and is left.
 *
 * `hays` are normalised haystacks (norm()), one per product, e.g. the
 * catalogue's universe.hay.values() or the header index rows' hay. Tokens are
 * tested with hasToken(), as the searches themselves do, so a rewrite that
 * still matches nothing ("sildenafill 20mg" when no sildenafil lists 20 mg) is
 * never offered. Returns null when the tokens already match something, when no
 * word could be rewritten, when nothing would be left to search, or when the
 * rewritten search still matches nothing: in those cases search with the
 * tokens as typed (and only then offer the custom request).
 */
export function relaxTokens(tokens: readonly string[], hays: Iterable<string>): Relaxed | null {
  if (!tokens.length) return null;
  const list = Array.isArray(hays) ? (hays as readonly string[]) : [...hays];
  const anyHas = (t: string) => list.some((h) => hasToken(h, t));
  const allIn = (ts: readonly string[]) => list.some((h) => hasAllTokens(h, ts));
  if (allIn(tokens)) return null;
  /** The haystacks' long words, built only if a word needs the one-edit rescue. */
  let vocab: string[] | null = null;
  const longWords = () => (vocab ??= [...new Set(list.flatMap((h) => h.split(" ")))].filter((w) => RELAXABLE.test(w)));

  /** The token to search with instead of `t` ("" = drop it); `first` = fewest letters to cut. */
  const rewrite = (t: string, first: number): string => {
    if (SALTS_ALWAYS.has(t)) return "";
    if (anyHas(t)) return t;
    const molecule = SYNONYMS.get(t)?.find(anyHas);
    if (molecule) return molecule;
    if (SALTS_IF_ABSENT.has(t)) return "";
    if (!RELAXABLE.test(t)) return t;
    for (let cut = first; cut <= MAX_CUT; cut++) {
      const c = t.slice(0, -cut);
      if (anyHas(c)) return c;
      // A misspelt brand name: "arimidexx" → "arimidex" → "anastrozole".
      const brand = SYNONYMS.get(c)?.find(anyHas);
      if (brand) return brand;
    }
    // One letter wrong, missing or swapped inside the word, when exactly one catalogue word is that close.
    const near = longWords().filter((w) => oneEdit(t, w));
    return near.length === 1 ? near[0] : t;
  };

  // Pass 1 shortens each unmatched word as little as possible; if the words
  // then don't all meet in one product, pass 2 retries with two letters off.
  // Brand names and salt words are rewritten the same way in both passes.
  for (let first = 1; first <= MAX_CUT; first++) {
    const changes: { from: string; to: string }[] = [];
    const next: string[] = [];
    for (const t of tokens) {
      const r = rewrite(t, first);
      if (r !== t) changes.push({ from: t, to: r });
      // "cialis tadalafil" searches "tadalafil" once.
      if (r && !next.includes(r)) next.push(r);
    }
    if (!changes.length) return null;
    if (next.length && allIn(next)) return { tokens: next, changes, query: next.join(" ") };
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
