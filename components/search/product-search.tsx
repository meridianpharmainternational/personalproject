"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Search, X } from "lucide-react";
import { highlightParts, searchCatalog, useCatalogIndexState, type SearchResult } from "@/lib/catalog-index";
import { tokenize } from "@/lib/search-text";
import { emphStrength, strengthEmphasis, strengthLine } from "@/components/catalog/catalog-model";
import { moleculeLabel } from "@/lib/format";
import { enquiryList } from "@/lib/enquiry-list";
import { customId } from "@/lib/enquiry-actions";
import { announce } from "@/lib/ui-store";
import { AddToEnquiry } from "@/components/enquiry/add-to-enquiry";
import { startNavigationProgress } from "@/components/navigation-progress";

type Mode = "popover" | "sheet";

/** Rows the arrow keys move between: the result links (and "Try again"). */
const ROW_SELECTOR = "[data-row]";

const UNAVAILABLE = "Search is temporarily unavailable.";

const productCount = (n: number) => `${n} ${n === 1 ? "product" : "products"}`;

/**
 * Product search used in two places:
 * - "popover": header search; results drop down in a panel (disclosure pattern,
 *   so the Add buttons inside rows stay valid). Ctrl+K / Cmd+K focuses it (a
 *   chord, not a bare "/", which WCAG 2.1.4 rules out).
 * - "sheet": full-screen mobile search (autofocus, popular molecules when empty).
 *
 * Keyboard: ArrowDown from the input moves into results, ArrowUp/Down moves
 * between rows (the result links), and Escape on a row returns focus to the
 * input. Escape in the input closes the header panel; in the sheet it first
 * clears the query, and a second Escape closes the dialog. Enter submits to /medicines?q= (works
 * without JavaScript too). Once something is typed, a 44px "Clear search"
 * button (in place of the browser's own "x") clears it and refocuses the input.
 *
 * A misspelt query that matched only after searchCatalog relaxed it
 * (`correctedTo`) is labelled "Showing results for …", visibly and in the
 * live region, and the corrected word is the one marked.
 *
 * A query with no search tokens (a lone letter, see tokenize) is treated as no
 * query. If the index can't be loaded, the panel says search is unavailable
 * and offers "Try again"; "No products match" and the custom request are only
 * shown once the index has loaded. When the query names a product plus a dose
 * we don't list, "No products match" also links to that product's other
 * strengths.
 *
 * ARIA: the input carries `aria-controls` but not `aria-expanded`, which is
 * not allowed on a searchbox (ARIA 1.2); this corrects spec §6. What the panel
 * shows is announced through the live region instead (WCAG 4.1.3).
 */
export function ProductSearch({
  mode,
  total,
  popular = [],
  autoFocus = false,
  onNavigate,
}: {
  mode: Mode;
  total?: number;
  popular?: { name: string; count: number }[];
  autoFocus?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const panelId = useId();
  const inputId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(autoFocus);
  const { index, status, retry } = useCatalogIndexState(focused || q.length > 0);
  const results = useMemo(() => (index ? searchCatalog(index, q) : null), [index, q]);
  // A product plus a dose we don't list ("cenforce 500mg") matches nothing;
  // the same words without the numbers may ("cenforce", 7 products), as in
  // MedicineCatalog. searchCatalog relaxes brand names and typos and reports
  // the words it searched in correctedTo. Null when the query has no number
  // token, has nothing else, or still matches nothing.
  const otherStrengths = useMemo(() => {
    if (!index || !results || results.total > 0) return null;
    const typed = tokenize(q);
    const words = typed.filter((t) => !/^\d/.test(t));
    if (!words.length || words.length === typed.length) return null;
    const r = searchCatalog(index, words.join(" "));
    return r.total > 0 ? { q: r.correctedTo || words.join(" "), total: r.total } : null;
  }, [index, results, q]);
  const term = q.trim();
  // A lone letter is no search term (tokenize drops it), so it opens no results.
  const hasQuery = tokenize(q).length > 0;
  // A corrected search marks the corrected word ("ivermectin"), not the typo.
  const markQ = results?.correctedTo || q;
  // The numbers the buyer typed ("200", "200mg"), whose strengths lead each row.
  // Strengths the query names come first (same rule as the catalogue card), so "cenforce 200mg" shows 200 mg.
  const emph = useMemo(() => strengthEmphasis([], tokenize(q)), [q]);
  const showPanel = mode === "sheet" || (hasQuery && focused);

  // Tell screen-reader users what the open panel now holds, once typing
  // pauses, so every keystroke isn't read out.
  const spoken =
    !showPanel || !hasQuery
      ? ""
      : status === "error"
        ? UNAVAILABLE
        : status === "ready" && results
          ? describeResults(results, term, otherStrengths)
          : "";
  useEffect(() => {
    if (!spoken) return;
    const t = window.setTimeout(() => announce(spoken), 500);
    return () => window.clearTimeout(t);
  }, [spoken]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Ctrl+K / Cmd+K focuses the header search. A chord, so no single key press
  // moves focus (WCAG 2.1.4). Not while typing in a field (on macOS Ctrl+K
  // deletes to the end of the line there), and not while a dialog makes the
  // header inert, so the browser's own shortcut still works then.
  useEffect(() => {
    if (mode !== "popover") return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "k") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const input = inputRef.current;
      if (!input || input.closest("[inert]")) return;
      e.preventDefault();
      input.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mode]);

  const rows = () => Array.from(wrapRef.current?.querySelectorAll<HTMLElement>(ROW_SELECTOR) ?? []);

  const moveFrom = (current: HTMLElement | null, dir: 1 | -1) => {
    const list = rows();
    if (!list.length) return;
    const i = current ? list.indexOf(current) : -1;
    const next = list[i + dir];
    if (next) next.focus();
    else if (dir === -1) inputRef.current?.focus();
  };

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && showPanel) {
      e.preventDefault();
      moveFrom(null, 1);
    } else if (e.key === "Escape") {
      if (mode === "popover") {
        setQ("");
        setFocused(false);
      } else if (q !== "") {
        // Sheet: the first Escape clears the query; the next one reaches the
        // dialog and closes it.
        consumeEscape(e);
        setQ("");
      }
    }
  };

  const onRowKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      moveFrom(e.currentTarget, e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Escape") {
      // Back to the input; in the sheet this must not also close the dialog.
      if (mode === "popover") e.preventDefault();
      else consumeEscape(e);
      inputRef.current?.focus();
      if (mode === "popover") setFocused(false);
    }
  };

  const done = () => {
    setQ("");
    setFocused(false);
    onNavigate?.();
  };

  const submit = () => {
    if (!term) return;
    done();
    const href = `/medicines?q=${encodeURIComponent(term)}`;
    startNavigationProgress(href);
    router.push(href);
  };

  // The same reset as Escape, from the "Clear search" button. The button
  // unmounts with the query, so focus goes back to the input for the next
  // search (not <body>).
  const clear = () => {
    setQ("");
    inputRef.current?.focus();
  };

  // The button unmounts as the retry starts loading, so move focus to the
  // input first: keyboard users don't land on <body>, and the header panel
  // (which closes when focus leaves the search) stays open.
  const tryAgain = () => {
    inputRef.current?.focus();
    retry();
  };

  const addCustom = () => {
    const name = term;
    if (!name) return;
    enquiryList.add({
      medicineId: customId(name),
      name,
      molecule: null,
      form: null,
      strengths: [],
      strength: null,
      image: null,
    });
    setQ("");
    // Clearing the query removes this button, so keep focus in the search
    // (not <body>) for the next product. The live region announces the add.
    inputRef.current?.focus();
  };

  // Short enough to show whole in the narrowest box of each mode: the header
  // box leaves ~119px at 1024 ("Search products" is 117px), the sheet ~228px
  // at 320. The longer "products, molecules, strengths" copy (spec §6) was cut
  // mid-word on tablets, small laptops and phones.
  const ph = mode === "popover" ? "Search products" : `Search ${total ? `${total} ` : ""}products`;

  return (
    <div
      ref={wrapRef}
      className={mode === "popover" ? "search" : "relative"}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) setFocused(false);
      }}
    >
      <form
        role="search"
        action="/medicines"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="relative"
      >
        <label htmlFor={inputId} className="sr-only">
          Search products
        </label>
        <Search className="search-icon" aria-hidden />
        <input
          ref={inputRef}
          id={inputId}
          name="q"
          type="search"
          autoComplete="off"
          spellCheck={false}
          // The browser's own clear "x" is hidden (as on the catalogue search)
          // for the "Clear search" button below, which is 44px and focusable.
          className="search-input [&::-webkit-search-cancel-button]:appearance-none"
          // Once something is typed, 3rem keeps the text clear of the 44px
          // "Clear search" button. While empty, the placeholder gets the room.
          style={
            mode === "popover"
              ? { paddingRight: q ? "3rem" : "1rem" }
              : { paddingRight: q ? "3rem" : "1rem", background: "#fff" }
          }
          placeholder={ph}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            // Escape, Enter and a result click close the header panel while
            // the input keeps focus, so no focus event follows to reopen it.
            // Typing always happens in the focused input, so it reopens here.
            setFocused(true);
          }}
          onKeyDown={onInputKey}
          aria-controls={showPanel ? panelId : undefined}
          aria-keyshortcuts={mode === "popover" ? "Control+K Meta+K" : undefined}
        />
        {q && (
          <button
            type="button"
            // Over the input's right edge, 44x44. bg-clip-padding keeps the
            // hover fill off the input's 1px border underneath.
            className="icon-btn icon-btn-bare absolute right-0 top-0 bg-clip-padding"
            aria-label="Clear search"
            // A press must not blur the input: that would close the header
            // panel (and a phone's keyboard) before the click lands.
            onMouseDown={(e) => e.preventDefault()}
            onClick={clear}
          >
            <X aria-hidden />
          </button>
        )}
      </form>

      {showPanel && (
        <div
          id={panelId}
          className="search-panel"
          // Header panel: a press inside it must not blur the input. Safari and
          // macOS Firefox don't focus a clicked button or link, so the blur
          // would close the panel before the click lands (and a press on the
          // scrollbar or on plain text would close it in every browser). The
          // click still fires; keyboard focus into the rows is unchanged.
          onMouseDown={mode === "popover" ? (e) => e.preventDefault() : undefined}
        >
          {!hasQuery && mode === "sheet" && popular.length > 0 && (
            <div className="search-group">
              <p className="kicker search-group-title">Popular molecules</p>
              {popular.map((m) => (
                <Link
                  key={m.name}
                  href={`/medicines?molecule=${encodeURIComponent(m.name)}`}
                  className="search-row"
                  data-row
                  onKeyDown={onRowKey}
                  onClick={done}
                >
                  <span className="search-row-title">{m.name}</span>
                  <span className="meta">{productCount(m.count)}</span>
                </Link>
              ))}
            </div>
          )}

          {hasQuery && status === "loading" && (
            <p className="px-4 py-4 text-sm text-fg-muted">Loading the catalogue…</p>
          )}

          {hasQuery && status === "error" && (
            <div className="search-group px-4 py-4">
              <p className="text-fg">{UNAVAILABLE}</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm mt-3"
                data-row
                onKeyDown={onRowKey}
                onClick={tryAgain}
              >
                Try again
              </button>
            </div>
          )}

          {hasQuery && status === "ready" && results && (
            <>
              {results.correctedTo && (
                <p className="field-help mt-0 px-4 pb-2 pt-3">Showing results for “{results.correctedTo}”</p>
              )}

              {results.products.length > 0 ? (
                <div className="search-group" role="group" aria-label="Products">
                  <p className="kicker search-group-title" aria-hidden>
                    Products
                  </p>
                  {results.products.map((p) => {
                    const meta = [moleculeLabel(p.molecule, p.ester), p.form].filter(Boolean).join(" · ");
                    const { shown, more } = strengthLine(p.strengths, emph);
                    return (
                      <div key={p.id} className="search-row">
                        <div className="min-w-0">
                          <Link
                            href={`/medicines/${p.id}`}
                            data-row
                            onKeyDown={onRowKey}
                            onClick={done}
                            className="search-row-title block truncate after:absolute after:inset-0"
                          >
                            <Highlight text={p.name} q={markQ} />
                          </Link>
                          {/* Two one-line subs, as in the catalogue's list rows (ProductRow):
                              "Ivermectin · Tablets", then "3 mg, 6 mg, 12 mg +2 more", a strength the
                              query names leading. "+N more" never shrinks, so in the narrow mobile
                              sheet the first strengths take the ellipsis and the count stays readable
                              (a product is never shown as if it came in only three strengths). Its
                              spaces are no-break spaces: a plain leading space would collapse in the
                              flex item. */}
                          {meta && <p className="search-row-sub truncate">{meta}</p>}
                          {shown && (
                            <p className="search-row-sub flex min-w-0">
                              <span className="truncate">{shown}</span>
                              {more > 0 && <span className="shrink-0 whitespace-nowrap">{` +${more} more`}</span>}
                            </p>
                          )}
                        </div>
                        <span className="relative z-[1]">
                          {/* The one strength the query names ("cenforce 100mg") is added with the line. */}
                          <AddToEnquiry product={p} strength={emphStrength(p.strengths, emph)} variant="icon" />
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="search-group px-4 py-4">
                  <p className="text-fg">
                    No products match <b>“{term}”</b>.
                  </p>
                  <div className="mt-3 flex flex-col items-start gap-2">
                    {/* The dose isn't listed but the product is: link to its other strengths.
                        The custom request still sends the query as typed, dose included. */}
                    {otherStrengths && (
                      <Link
                        href={`/medicines?q=${encodeURIComponent(otherStrengths.q)}`}
                        className="link-arrow"
                        data-row
                        onKeyDown={onRowKey}
                        onClick={done}
                      >
                        <span>
                          See “{otherStrengths.q}” in other strengths ({otherStrengths.total}
                          <span className="sr-only"> {otherStrengths.total === 1 ? "product" : "products"}</span>)
                        </span>
                        <ArrowRight aria-hidden />
                      </Link>
                    )}
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addCustom}>
                      <Plus aria-hidden /> Add “{term}” as a custom request
                    </button>
                  </div>
                </div>
              )}

              {results.molecules.length > 0 && (
                <div className="search-group" role="group" aria-label="Molecules">
                  <p className="kicker search-group-title" aria-hidden>
                    Molecules
                  </p>
                  {results.molecules.map((m) => (
                    <Link
                      key={m.name}
                      href={`/medicines?molecule=${encodeURIComponent(m.name)}`}
                      className="search-row"
                      data-row
                      onKeyDown={onRowKey}
                      onClick={done}
                    >
                      <span className="search-row-title">
                        <Highlight text={m.name} q={markQ} />
                      </span>
                      <span className="meta">{productCount(m.count)}</span>
                    </Link>
                  ))}
                </div>
              )}

              {results.categories.length > 0 && (
                <div className="search-group" role="group" aria-label="Categories">
                  <p className="kicker search-group-title" aria-hidden>
                    Categories
                  </p>
                  {results.categories.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/medicines?category=${c.slug}`}
                      className="search-row"
                      data-row
                      onKeyDown={onRowKey}
                      onClick={done}
                    >
                      <span className="search-row-title">{c.name}</span>
                      <span className="meta">{productCount(c.count)}</span>
                    </Link>
                  ))}
                </div>
              )}

              {results.total > 0 && (
                <div className="search-foot">
                  <Link
                    href={`/medicines?q=${encodeURIComponent(term)}`}
                    className="link-arrow"
                    data-row
                    onKeyDown={onRowKey}
                    onClick={done}
                  >
                    See all {results.total} {results.total === 1 ? "result" : "results"} for “{term}”
                    <ArrowRight aria-hidden />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Handles an Escape here without also closing the surrounding dialog (the
 * search sheet). useDialog listens on document, after React's root
 * listener there, so stopping immediate propagation keeps it from running;
 * preventDefault also marks the key as handled for listeners that check
 * `defaultPrevented`.
 */
function consumeEscape(e: KeyboardEvent<Element>) {
  e.preventDefault();
  e.nativeEvent.stopImmediatePropagation();
}

/** Live-region text for what the open results panel shows. */
function describeResults(r: SearchResult, term: string, other: { q: string; total: number } | null = null): string {
  if (!r.total) {
    return other
      ? `No products match “${term}”. “${other.q}” is listed in other strengths. Press Down arrow to move to the link.`
      : `No products match “${term}”.`;
  }
  // A corrected search says what it searched for, aloud too.
  const lead = r.correctedTo ? `Showing results for “${r.correctedTo}”. ` : "";
  const products = productCount(r.total);
  const m = r.molecules.length;
  const molecules = m ? ` and ${m} ${m === 1 ? "molecule" : "molecules"}` : "";
  return `${lead}${products}${molecules} ${r.total === 1 && !m ? "matches" : "match"}. Press Down arrow to move into the results.`;
}

function Highlight({ text, q }: { text: string; q: string }) {
  return (
    <>
      {highlightParts(text, q).map((p, i) => (p.match ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>))}
    </>
  );
}
