"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useDialog } from "@/lib/use-dialog";

/**
 * Mobile/tablet filter dialog: a bottom sheet under 640px, a right-hand
 * drawer up to 1024px. Rendered into <body> so useDialog can make the rest of
 * the page inert. Sticky foot: [Clear] + [Show N products] (live count).
 */
export function FilterSheet({
  open,
  onClose,
  resultCount,
  canClear,
  onClear,
  children,
}: {
  open: boolean;
  onClose: () => void;
  resultCount: number;
  canClear: boolean;
  onClear: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const finish = useCallback(() => {
    setClosing(false);
    setMounted(false);
  }, []);

  // Fallback in case animationend never fires.
  useEffect(() => {
    if (!closing) return;
    const t = window.setTimeout(finish, 360);
    return () => window.clearTimeout(t);
  }, [closing, finish]);

  useDialog(mounted && !closing, containerRef, onClose, titleRef);

  if (!mounted) return null;

  const label =
    resultCount === 0 ? "No matching products" : `Show ${resultCount} product${resultCount === 1 ? "" : "s"}`;

  return createPortal(
    <div ref={containerRef} data-dialog-root>
      <div className="backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className={`drawer${closing ? " is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onAnimationEnd={(e) => {
          if (closing && e.target === e.currentTarget) finish();
        }}
      >
        <div className="drawer-grip" aria-hidden="true" />
        <div className="drawer-head">
          <h2 id={titleId} ref={titleRef} tabIndex={-1} className="drawer-title outline-0">
            Filters
          </h2>
          <button type="button" className="icon-btn icon-btn-bare" onClick={onClose} aria-label="Close filters">
            <X aria-hidden />
          </button>
        </div>
        {/* The drawer-head already draws a rule; drop the first group's top border so it isn't doubled. */}
        <div className="drawer-body [&>div>.filter-group:first-child]:border-t-0">{children}</div>
        <div className="drawer-foot grid-cols-[auto_minmax(0,1fr)]">
          {/* Clearing disables this button, which would drop focus to <body> inside the modal;
              hand focus to the dialog title instead. */}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              onClear();
              requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
            }}
            disabled={!canClear}
          >
            Clear
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {label}
          </button>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
