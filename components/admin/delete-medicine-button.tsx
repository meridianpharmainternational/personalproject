"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteMedicine } from "@/app/admin/medicines/actions";
import { announce } from "@/lib/ui-store";

export function DeleteMedicineButton({
  id,
  name,
  className = "",
}: {
  id: string;
  name: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => {
        if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
          startTransition(async () => {
            await deleteMedicine(id);
            announce(`${name} deleted.`);
          });
        }
      }}
      className={`btn btn-danger btn-sm ${className}`}
    >
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" />
          Deleting…
        </>
      ) : (
        <>
          <Trash2 aria-hidden="true" />
          Delete
          <span className="sr-only"> {name}</span>
        </>
      )}
    </button>
  );
}
