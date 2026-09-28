"use client";

import { useTransition } from "react";
import { MailOpen, Archive, RotateCcw, Trash2 } from "lucide-react";
import {
  setEnquiryStatus,
  deleteEnquiry,
} from "@/app/admin/enquiries/actions";
import type { EnquiryStatus } from "@/types/db";

export function EnquiryRowActions({
  id,
  status,
}: {
  id: string;
  status: EnquiryStatus;
}) {
  const [pending, startTransition] = useTransition();

  const act = (fn: () => Promise<void>) => () => startTransition(() => void fn());

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "read" && (
        <button
          disabled={pending}
          onClick={act(() => setEnquiryStatus(id, "read"))}
          className="btn btn-outline px-3 py-1.5 text-sm disabled:opacity-50"
        >
          <MailOpen className="h-3.5 w-3.5" />
          Mark read
        </button>
      )}
      {status !== "archived" && (
        <button
          disabled={pending}
          onClick={act(() => setEnquiryStatus(id, "archived"))}
          className="btn btn-outline px-3 py-1.5 text-sm disabled:opacity-50"
        >
          <Archive className="h-3.5 w-3.5" />
          Archive
        </button>
      )}
      {status !== "new" && (
        <button
          disabled={pending}
          onClick={act(() => setEnquiryStatus(id, "new"))}
          className="btn btn-outline px-3 py-1.5 text-sm disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Mark new
        </button>
      )}
      <button
        disabled={pending}
        onClick={() => {
          if (window.confirm("Delete this enquiry?")) {
            startTransition(() => void deleteEnquiry(id));
          }
        }}
        className="btn btn-outline px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
    </div>
  );
}
