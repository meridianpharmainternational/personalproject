"use client";

import { useState, useTransition, type ReactNode } from "react";
import { MailOpen, Archive, RotateCcw, Trash2 } from "lucide-react";
import {
  setEnquiryStatus,
  deleteEnquiry,
} from "@/app/admin/enquiries/actions";
import { announce } from "@/lib/ui-store";
import type { EnquiryStatus } from "@/types/db";

type Which = "read" | "archived" | "new" | "delete";

const UPDATE_FAILED = "Couldn't update this enquiry. Try again.";
const DELETE_FAILED = "Couldn't delete this enquiry. Try again.";

export function EnquiryRowActions({
  id,
  status,
  name,
  className = "",
}: {
  id: string;
  status: EnquiryStatus;
  /** Sender's name, for screen-reader context on each button. */
  name?: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [which, setWhich] = useState<Which | null>(null);
  const who = name ? `enquiry from ${name}` : "enquiry";

  const act =
    (w: Which, fn: () => Promise<{ ok: boolean }>, done: string) => () => {
      setWhich(w);
      startTransition(async () => {
        try {
          const res = await fn();
          announce(res.ok ? done : UPDATE_FAILED);
        } catch {
          // A thrown action (network failure, server error) is a failure too.
          announce(UPDATE_FAILED);
        }
      });
    };

  const label = (w: Which, icon: ReactNode, text: string) =>
    pending && which === w ? (
      <>
        <span className="spinner" aria-hidden="true" />
        {text}
      </>
    ) : (
      <>
        {icon}
        {text}
      </>
    );

  return (
    <div className={`flex flex-wrap gap-2 ${className}`} aria-busy={pending || undefined}>
      {status !== "read" && (
        <button
          type="button"
          disabled={pending}
          onClick={act("read", () => setEnquiryStatus(id, "read"), `Marked ${who} as read.`)}
          className="btn btn-secondary btn-sm"
        >
          {label("read", <MailOpen aria-hidden="true" />, "Mark read")}
          <span className="sr-only">: {who}</span>
        </button>
      )}
      {status !== "archived" && (
        <button
          type="button"
          disabled={pending}
          onClick={act("archived", () => setEnquiryStatus(id, "archived"), `Archived ${who}.`)}
          className="btn btn-secondary btn-sm"
        >
          {label("archived", <Archive aria-hidden="true" />, "Archive")}
          <span className="sr-only">: {who}</span>
        </button>
      )}
      {status !== "new" && (
        <button
          type="button"
          disabled={pending}
          onClick={act("new", () => setEnquiryStatus(id, "new"), `Marked ${who} as new.`)}
          className="btn btn-secondary btn-sm"
        >
          {label("new", <RotateCcw aria-hidden="true" />, "Mark new")}
          <span className="sr-only">: {who}</span>
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Delete this enquiry?")) {
            setWhich("delete");
            startTransition(async () => {
              try {
                const res = await deleteEnquiry(id);
                announce(res.ok ? `Deleted ${who}.` : DELETE_FAILED);
              } catch {
                announce(DELETE_FAILED);
              }
            });
          }
        }}
        className="btn btn-danger btn-sm sm:ml-auto"
      >
        {label("delete", <Trash2 aria-hidden="true" />, "Delete")}
        <span className="sr-only">: {who}</span>
      </button>
    </div>
  );
}
