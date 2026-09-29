"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Search } from "lucide-react";
import { DeleteMedicineButton } from "@/components/admin/delete-medicine-button";

export type AdminMedicineRow = {
  id: string;
  name: string;
  molecule: string | null;
  form: string | null;
  strengths: string[];
  categoryId: string | null;
  categoryName: string | null;
  isActive: boolean;
  image: string | null;
};

type StatusFilter = "all" | "active" | "hidden";

const PAGE = 50;

/**
 * Admin medicines list: client-side search (name / molecule), category and
 * status filters over the server-fetched rows, shown 50 at a time.
 * Table from 768px; stacked rows on phones.
 */
export function MedicineTable({
  rows,
  categories,
}: {
  rows: AdminMedicineRow[];
  categories: { id: string; name: string; count: number }[];
}) {
  const uid = useId();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [limit, setLimit] = useState(PAGE);
  const [focusFrom, setFocusFrom] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);
  const prevData = useRef(rows);

  // A delete removes the focused row; park focus on the results line instead
  // of letting it fall back to <body>.
  useEffect(() => {
    if (prevData.current === rows) return;
    prevData.current = rows;
    const a = document.activeElement;
    if (!a || a === document.body) countRef.current?.focus({ preventScroll: true });
  }, [rows]);

  const uncategorised = useMemo(() => rows.filter((r) => !r.categoryId).length, [rows]);
  const activeCount = useMemo(() => rows.filter((r) => r.isActive).length, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (needle && !r.name.toLowerCase().includes(needle) && !(r.molecule ?? "").toLowerCase().includes(needle)) {
        return false;
      }
      if (cat === "none" ? r.categoryId !== null : cat !== "all" && r.categoryId !== cat) return false;
      if (status === "active" && !r.isActive) return false;
      if (status === "hidden" && r.isActive) return false;
      return true;
    });
  }, [rows, q, cat, status]);

  const shown = filtered.slice(0, limit);
  const remaining = filtered.length - shown.length;
  const hasFilters = q.trim() !== "" || cat !== "all" || status !== "all";

  // After "Show more", move focus to the first newly revealed row's Edit link.
  useEffect(() => {
    if (focusFrom === null) return;
    const links = listRef.current?.querySelectorAll<HTMLElement>(`[data-row="${focusFrom}"] [data-edit]`);
    const visible = Array.from(links ?? []).find((el) => el.offsetParent !== null);
    visible?.focus();
    setFocusFrom(null);
  }, [focusFrom]);

  const reset = () => {
    setQ("");
    setCat("all");
    setStatus("all");
    setLimit(PAGE);
  };

  if (rows.length === 0) {
    return (
      <div className="empty">
        <h2 className="text-h4 font-sans tracking-normal">No medicines yet</h2>
        <p className="text-fg-muted">Add your first product to start the public catalogue.</p>
        <Link href="/admin/medicines/new" className="btn btn-primary">
          <Plus aria-hidden="true" />
          Add medicine
        </Link>
      </div>
    );
  }

  return (
    <div ref={listRef}>
      {/* ---------------------------------------------------------- filters */}
      <div role="search" aria-label="Filter medicines" className="grid gap-4 md:grid-cols-[minmax(0,1fr)_15rem_12rem]">
        <div>
          <label className="label" htmlFor={`${uid}-q`}>
            Search
          </label>
          <div className="relative">
            <Search aria-hidden="true" className="search-icon" />
            <input
              id={`${uid}-q`}
              type="search"
              className="input pl-11"
              placeholder="Name or molecule"
              autoComplete="off"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(PAGE);
              }}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor={`${uid}-cat`}>
            Category
          </label>
          <select
            id={`${uid}-cat`}
            className="select"
            value={cat}
            onChange={(e) => {
              setCat(e.target.value);
              setLimit(PAGE);
            }}
          >
            <option value="all">All categories ({rows.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.count})
              </option>
            ))}
            {uncategorised > 0 && <option value="none">No category ({uncategorised})</option>}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${uid}-status`}>
            Status
          </label>
          <select
            id={`${uid}-status`}
            className="select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusFilter);
              setLimit(PAGE);
            }}
          >
            <option value="all">All ({rows.length})</option>
            <option value="active">Active ({activeCount})</option>
            <option value="hidden">Hidden ({rows.length - activeCount})</option>
          </select>
        </div>
      </div>

      <div className="mt-5 flex min-h-[44px] flex-wrap items-center justify-between gap-2">
        <p ref={countRef} tabIndex={-1} className="results-count" aria-live="polite" aria-atomic="true">
          {filtered.length === rows.length
            ? `${rows.length} medicine${rows.length === 1 ? "" : "s"}`
            : `${filtered.length} of ${rows.length} medicines match`}
        </p>
        {hasFilters && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty mt-4">
          <h2 className="text-h4 font-sans tracking-normal">No medicines match these filters</h2>
          <p className="text-fg-muted">Try a different name or molecule, or clear the filters.</p>
          <button type="button" className="btn btn-secondary" onClick={reset}>
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* ------------------------------------------ table (768px and up) */}
          <div className="ptable-wrap mt-4 hidden overflow-clip md:block">
            <table className="ptable [&_th]:top-header">
              <caption className="sr-only">
                Medicines, showing {shown.length} of {filtered.length}
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="w-[80px]">
                    <span className="sr-only">Image</span>
                  </th>
                  <th scope="col">Product</th>
                  <th scope="col">Category</th>
                  <th scope="col" className="hidden xl:table-cell">
                    Form
                  </th>
                  <th scope="col" className="hidden lg:table-cell">
                    Strengths
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => (
                  <tr key={r.id} data-row={i}>
                    <td>
                      <Thumb row={r} />
                    </td>
                    <td>
                      <div className="pname">{r.name}</div>
                      <div className="psub">
                        {r.molecule ?? "No molecule"}
                        {r.form && <span className="xl:hidden"> · {r.form}</span>}
                      </div>
                    </td>
                    <td className="text-fg">{r.categoryName ?? <span className="text-fg-subtle">None</span>}</td>
                    <td className="hidden text-fg xl:table-cell">{r.form ?? <span className="text-fg-subtle">—</span>}</td>
                    <td className="hidden lg:table-cell">
                      <Strengths list={r.strengths} />
                    </td>
                    <td>
                      <StatusBadge active={r.isActive} />
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/medicines/${r.id}/edit`} className="btn btn-secondary btn-sm" data-edit>
                          <Pencil aria-hidden="true" />
                          Edit
                          <span className="sr-only"> {r.name}</span>
                        </Link>
                        <DeleteMedicineButton id={r.id} name={r.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ------------------------------------------------- phone rows */}
          <ul className="mt-4 divide-y divide-rule border-y border-rule md:hidden">
            {shown.map((r, i) => (
              <li key={r.id} data-row={i} className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-3 gap-y-3 py-4">
                <Thumb row={r} />
                <div className="min-w-0">
                  <p className="font-semibold leading-snug text-fg-strong">{r.name}</p>
                  <p className="text-sm text-fg-muted">
                    {[r.molecule, r.form, r.categoryName].filter(Boolean).join(" · ") || "No details"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusBadge active={r.isActive} />
                    <Strengths list={r.strengths} />
                  </div>
                </div>
                <div className="col-span-2 flex gap-2">
                  <Link href={`/admin/medicines/${r.id}/edit`} className="btn btn-secondary btn-sm flex-1" data-edit>
                    <Pencil aria-hidden="true" />
                    Edit
                    <span className="sr-only"> {r.name}</span>
                  </Link>
                  <DeleteMedicineButton id={r.id} name={r.name} className="flex-1" />
                </div>
              </li>
            ))}
          </ul>

          {remaining > 0 && (
            <div className="loadmore">
              <div className="loadmore-progress" aria-hidden="true">
                <span style={{ transform: `scaleX(${shown.length / filtered.length})` }} />
              </div>
              <p className="loadmore-text">
                {shown.length} / {filtered.length}
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => {
                  setFocusFrom(shown.length);
                  setLimit((n) => n + PAGE);
                }}
              >
                Show {Math.min(PAGE, remaining)} more · {remaining} remaining
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Thumb({ row }: { row: AdminMedicineRow }) {
  if (row.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={row.image}
        alt=""
        width={48}
        height={48}
        loading="lazy"
        decoding="async"
        className="h-12 w-12 rounded-sm border border-rule bg-paper object-contain"
      />
    );
  }
  const abbr = (row.form ?? "").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "—";
  return (
    <span
      aria-hidden="true"
      className="grid h-12 w-12 place-items-center rounded-sm border border-rule bg-paper font-mono text-xs uppercase text-fg-muted"
    >
      {abbr}
    </span>
  );
}

function Strengths({ list }: { list: string[] }) {
  if (list.length === 0) return <span className="text-fg-subtle">—</span>;
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {list.slice(0, 3).map((s) => (
        <span key={s} className="badge badge-code">
          {s}
        </span>
      ))}
      {list.length > 3 && (
        <span className="badge badge-code" title={list.slice(3).join(", ")}>
          +{list.length - 3}
          <span className="sr-only"> more: {list.slice(3).join(", ")}</span>
        </span>
      )}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="badge badge-new">
      <span aria-hidden="true" className="h-2 w-2 rounded-sm bg-navy-900" />
      Active
    </span>
  ) : (
    <span className="badge badge-mto">Hidden</span>
  );
}
