"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteMedicine } from "@/app/admin/medicines/actions";

export function DeleteMedicineButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          window.confirm(`Delete "${name}"? This cannot be undone.`)
        ) {
          startTransition(() => {
            void deleteMedicine(id);
          });
        }
      }}
      className="btn btn-outline px-3 py-1.5 text-red-600 hover:border-red-200 hover:bg-red-50"
    >
      {pending ? (
        "…"
      ) : (
        <>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </>
      )}
    </button>
  );
}
