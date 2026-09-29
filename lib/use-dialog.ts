"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

/* ------------------------------------------------------------------ stack */

type DialogEntry = {
  container: HTMLElement;
  close: () => void;
  focusTarget: () => HTMLElement;
};

/** Open dialogs, bottom → top. Only the top one is interactive and answers Escape. */
const stack: DialogEntry[] = [];
/** Elements this module made inert. `inert` set by anyone else is never touched. */
const madeInert = new Set<HTMLElement>();
/** body's own overflow, saved when the first dialog opens, restored when the last closes. */
let savedOverflow = "";
/** Bumped on every open, so a pending focus return gives way to a newer dialog. */
let openCount = 0;

/** How long to keep retrying an opener that is still in the page but not focusable yet. */
const RETRY_MS = 700;

/**
 * Make every top-level element except the top dialog inert (and anything marked
 * `data-keep-interactive`, e.g. toast and live region). Recomputed on every
 * open/close, so closing an inner dialog hands interactivity back to the one
 * beneath it, and closing an outer one never un-inerts what the top one needs.
 */
function syncInert() {
  const top = stack[stack.length - 1];
  const want = new Set<HTMLElement>();
  if (top) {
    for (const el of Array.from(document.body.children)) {
      if (
        el instanceof HTMLElement &&
        el !== top.container &&
        !el.contains(top.container) &&
        !el.hasAttribute("data-keep-interactive") &&
        el.tagName !== "SCRIPT"
      ) {
        want.add(el);
      }
    }
  }
  for (const el of Array.from(madeInert)) {
    if (!want.has(el)) {
      el.removeAttribute("inert");
      madeInert.delete(el);
    }
  }
  want.forEach((el) => {
    if (!madeInert.has(el) && !el.hasAttribute("inert")) {
      el.setAttribute("inert", "");
      madeInert.add(el);
    }
  });
}

function onEscape(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  const top = stack[stack.length - 1];
  if (!top) return;
  e.preventDefault();
  top.close();
}

/* ---------------------------------------------------------- focus history */

const HISTORY_MAX = 8;
/** The last few elements that received focus, oldest first. */
const focusHistory: HTMLElement[] = [];
let tracking = false;

function trackFocus() {
  if (tracking) return;
  tracking = true;
  document.addEventListener(
    "focusin",
    (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement) || t === document.body) return;
      const i = focusHistory.indexOf(t);
      if (i !== -1) focusHistory.splice(i, 1);
      focusHistory.push(t);
      if (focusHistory.length > HISTORY_MAX) focusHistory.shift();
    },
    true,
  );
}

/**
 * The control to return focus to on close. Normally the focused element at
 * open time. When focus has already fallen to <body> because the focused
 * control was removed (the toast's "View list" dismisses its own toast), or
 * has already moved into the dialog, walk back past those elements to the
 * last control that is still in the page. If focus was simply blurred
 * (nothing removed), that older entry is stale and there is no opener.
 */
function findOpener(container: HTMLElement): HTMLElement | null {
  const a = document.activeElement;
  if (a instanceof HTMLElement && a !== document.body && !container.contains(a)) return a;
  let lost = a instanceof HTMLElement && a !== document.body; // already inside the dialog
  for (let i = focusHistory.length - 1; i >= 0; i--) {
    const el = focusHistory[i];
    if (!el.isConnected || container.contains(el)) {
      lost = true;
      continue;
    }
    return lost ? el : null;
  }
  return null;
}

/** Focus `el` and report whether it actually took focus (hidden, inert and disabled elements don't). */
function tryFocus(el: HTMLElement | null | undefined, container: HTMLElement): boolean {
  if (!el || el === document.body || !el.isConnected || container.contains(el)) return false;
  el.focus({ preventScroll: true });
  return document.activeElement === el;
}

/**
 * Return focus after `container`'s dialog closed. Order: the opener; if it is
 * still in the page but can't take focus yet (the mobile enquiry bar stays
 * `visibility:hidden` until the store closes, after the drawer's exit
 * animation), keep retrying for a moment; then `fallback`; then the dialog
 * underneath, if any. Every step checks the result instead of assuming it.
 */
function returnFocus(
  container: HTMLElement,
  opener: HTMLElement | null,
  fallback: (() => HTMLElement | null | undefined) | undefined,
  seq: number,
) {
  const rest = () => {
    if (tryFocus(fallback?.(), container)) return;
    const top = stack[stack.length - 1];
    if (top) tryFocus(top.focusTarget(), container);
  };

  if (tryFocus(opener, container)) return;
  const below = stack[stack.length - 1];
  // An opener outside the dialog that is still open underneath stays inert, so waiting won't help.
  if (!opener || !opener.isConnected || (below && !below.container.contains(opener))) {
    rest();
    return;
  }

  const until = performance.now() + RETRY_MS;
  const retry = () => {
    if (openCount !== seq) return; // a newer dialog owns focus now
    const a = document.activeElement;
    if (a && a !== document.body && !container.contains(a)) return; // focus has already moved on
    if (tryFocus(opener, container)) return;
    if (opener.isConnected && performance.now() < until) requestAnimationFrame(retry);
    else rest();
  };
  requestAnimationFrame(retry);
}

/* ------------------------------------------------------------------- hook */

/**
 * Proper modal-dialog behaviour for drawers, sheets and modals:
 * - every other top-level element becomes `inert` (so Tab can't escape and
 *   screen readers only see the dialog), except elements marked
 *   `data-keep-interactive` (toast, live region);
 * - Escape closes (only the top-most dialog when several are open);
 * - page scroll is locked while any dialog is open;
 * - focus moves into the dialog on open and returns to the opener on close,
 *   or to `fallbackFocus()` when the opener is gone or can't take focus
 *   (pass a stable control, e.g. the header's `.enq-btn` for the enquiry drawer).
 *
 * Dialogs stack: each open pushes, each close pops, and inert/scroll lock are
 * recomputed from the stack, so nested or overlapping dialogs don't undo each
 * other.
 *
 * `containerRef` must point at the element that wraps BOTH the backdrop and the
 * dialog panel, rendered as a direct child of <body>.
 */
export function useDialog(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>,
  fallbackFocus?: () => HTMLElement | null | undefined,
) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const fallbackRef = useRef(fallbackFocus);
  fallbackRef.current = fallbackFocus;

  // A layout effect runs before every passive effect in the commit, so the
  // opener is read before a child's autofocus effect (the search sheet's input)
  // moves focus into the dialog.
  useLayoutEffect(() => {
    trackFocus();
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    const opener = findOpener(container);
    const entry: DialogEntry = {
      container,
      close: () => closeRef.current(),
      focusTarget: () => initialFocusRef?.current ?? container,
    };

    if (stack.length === 0) {
      savedOverflow = document.body.style.overflow;
      document.addEventListener("keydown", onEscape);
    }
    stack.push(entry);
    openCount += 1;
    syncInert();
    document.body.style.overflow = "hidden";

    const focusTarget = initialFocusRef?.current ?? container;
    const raf = requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));

    return () => {
      cancelAnimationFrame(raf);
      const i = stack.indexOf(entry);
      if (i === -1) return;
      const wasTop = i === stack.length - 1;
      stack.splice(i, 1);
      syncInert();
      if (stack.length === 0) {
        document.body.style.overflow = savedOverflow;
        document.removeEventListener("keydown", onEscape);
      }
      // A dialog closing underneath another must not pull focus out of the top one.
      if (wasTop) returnFocus(container, opener, fallbackRef.current, openCount);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
