"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Check, EyeOff, Trash2, X } from "lucide-react";
import { removeReview, setReviewStatus } from "@/app/admin/reviews/actions";
import { announce } from "@/lib/ui-store";
import type { ReviewStatus } from "@/lib/reviews";

type Which = "approve" | "reject" | "delete";

const FAILED = "Couldn't update this review. Try again.";

/**
 * Moderation buttons for one review: Approve (publish), Reject / Hide (keep it
 * off the site) and Delete (for good, with its photo, after a confirm). The
 * server action revalidates /admin/reviews, so the list refreshes by itself.
 */
export function ReviewRowActions({ file, status, name }: { file: string; status: ReviewStatus; name: string }) {
  const [pending, startTransition] = useTransition();
  const [which, setWhich] = useState<Which | null>(null);
  const who = `review from ${name}`;

  const act = (w: Which, fn: () => Promise<{ ok: boolean }>, done: string) => () => {
    if (w === "delete" && !window.confirm(`Delete the ${who} for good? This cannot be undone.`)) return;
    setWhich(w);
    startTransition(async () => {
      try {
        const res = await fn();
        announce(res.ok ? done : FAILED);
      } catch {
        announce(FAILED);
      }
    });
  };

  const label = (w: Which, icon: ReactNode, text: string) => (
    <>
      {pending && which === w ? <span className="spinner" aria-hidden="true" /> : icon}
      {text}
      <span className="sr-only">: {who}</span>
    </>
  );

  return (
    <div className="flex flex-wrap gap-2" aria-busy={pending || undefined}>
      {status !== "approved" && (
        <button
          type="button"
          disabled={pending}
          onClick={act("approve", () => setReviewStatus(file, status, "approved"), `Published the ${who}.`)}
          className="btn btn-primary btn-sm"
        >
          {label("approve", <Check aria-hidden="true" />, "Approve")}
        </button>
      )}
      {status !== "rejected" && (
        <button
          type="button"
          disabled={pending}
          onClick={act("reject", () => setReviewStatus(file, status, "rejected"), `The ${who} is hidden.`)}
          className="btn btn-secondary btn-sm"
        >
          {status === "approved"
            ? label("reject", <EyeOff aria-hidden="true" />, "Hide")
            : label("reject", <X aria-hidden="true" />, "Reject")}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={act("delete", () => removeReview(file, status), `Deleted the ${who}.`)}
        className="btn btn-danger btn-sm"
      >
        {label("delete", <Trash2 aria-hidden="true" />, "Delete")}
      </button>
    </div>
  );
}
