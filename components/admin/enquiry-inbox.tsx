"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Mail, Phone, Reply, Search } from "lucide-react";
import { EnquiryRowActions } from "@/components/admin/enquiry-row-actions";
import type { Enquiry, EnquiryStatus } from "@/types/db";

export type InboxTab = "all" | EnquiryStatus;

const TABS: { key: InboxTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "read", label: "Read" },
  { key: "archived", label: "Archived" },
];

const PAGE = 25;

/**
 * Admin enquiries inbox: status tabs with counts, a search box (name, email,
 * company, country, product), newest first, 25 at a time. Multi-product
 * enquiry lists ("1. Cenforce 100 mg (Sildenafil Citrate, Tablets) — 10 packs")
 * are rendered as an ordered list with the pack count set apart.
 */
export function EnquiryInbox({
  enquiries,
  initialTab = "all",
}: {
  enquiries: Enquiry[];
  initialTab?: InboxTab;
}) {
  const uid = useId();
  const [tab, setTab] = useState<InboxTab>(initialTab);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const countRef = useRef<HTMLParagraphElement>(null);
  const prevData = useRef(enquiries);

  // When a status change or delete removes the focused card, focus would fall
  // back to <body>; park it on the results line instead.
  useEffect(() => {
    if (prevData.current === enquiries) return;
    prevData.current = enquiries;
    const a = document.activeElement;
    if (!a || a === document.body) countRef.current?.focus({ preventScroll: true });
  }, [enquiries]);

  const sorted = useMemo(
    () => [...enquiries].sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0)),
    [enquiries],
  );

  const matching = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return sorted;
    return sorted.filter((e) =>
      [e.name, e.email, e.company, e.country, e.product].some((v) => (v ?? "").toLowerCase().includes(needle)),
    );
  }, [sorted, q]);

  const counts = useMemo(() => {
    const c: Record<InboxTab, number> = { all: matching.length, new: 0, read: 0, archived: 0 };
    for (const e of matching) c[e.status] = (c[e.status] ?? 0) + 1;
    return c;
  }, [matching]);

  const visible = tab === "all" ? matching : matching.filter((e) => e.status === tab);
  const shown = visible.slice(0, limit);
  const remaining = visible.length - shown.length;

  const selectTab = (next: InboxTab, focus = false) => {
    setTab(next);
    setLimit(PAGE);
    if (focus) tabRefs.current[TABS.findIndex((t) => t.key === next)]?.focus();
    try {
      const url = new URL(window.location.href);
      if (next === "all") url.searchParams.delete("status");
      else url.searchParams.set("status", next);
      // Pass our own state (not Next's, which carries __NA): Next's patched
      // replaceState then copies its internals over and syncs the router's
      // canonical URL, so later server-action refreshes keep ?status.
      window.history.replaceState(null, "", url);
    } catch {
      /* ignore */
    }
  };

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.key === tab);
    let n = -1;
    if (e.key === "ArrowRight") n = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = TABS.length - 1;
    if (n < 0) return;
    e.preventDefault();
    selectTab(TABS[n].key, true);
  };

  if (enquiries.length === 0) {
    return (
      <div className="empty">
        <h2 className="text-h4 font-sans tracking-normal">No enquiries yet</h2>
        <p className="text-fg-muted">
          Enquiry-list submissions and contact-form messages will appear here, newest first.
        </p>
      </div>
    );
  }

  const tabLabel = TABS.find((t) => t.key === tab)?.label.toLowerCase() ?? "";

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div
          role="tablist"
          aria-label="Filter enquiries by status"
          className="tabs lg:flex-1"
          onKeyDown={onTabKey}
        >
          {TABS.map((t, i) => (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`${uid}-panel`}
              tabIndex={tab === t.key ? 0 : -1}
              className="tab"
              onClick={() => selectTab(t.key)}
            >
              {t.label}
              <span className="count">{counts[t.key]}</span>
            </button>
          ))}
        </div>

        <div role="search" className="lg:w-[26rem]">
          <label className="label" htmlFor={`${uid}-q`}>
            Search enquiries
          </label>
          <div className="relative">
            <Search aria-hidden="true" className="search-icon" />
            <input
              id={`${uid}-q`}
              type="search"
              className="input pl-11"
              placeholder="Name, email, company, country or product"
              autoComplete="off"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(PAGE);
              }}
            />
          </div>
        </div>
      </div>

      <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`} className="mt-5">
        <div className="flex min-h-[44px] flex-wrap items-center justify-between gap-2">
          <p ref={countRef} tabIndex={-1} className="results-count" aria-live="polite" aria-atomic="true">
            {visible.length === 0
              ? "No enquiries to show"
              : `${visible.length} ${tab === "all" ? "" : `${tabLabel} `}enquir${visible.length === 1 ? "y" : "ies"}${
                  q.trim() ? ` matching “${q.trim()}”` : ""
                }`}
          </p>
          {q.trim() && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQ("")}>
              Clear search
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="empty mt-4">
            <h2 className="text-h4 font-sans tracking-normal">
              {q.trim() ? "No enquiries match your search" : `No ${tabLabel} enquiries`}
            </h2>
            <p className="text-fg-muted">
              {q.trim()
                ? "Try a name, email address, company, country or product."
                : "Enquiries move here when you change their status."}
            </p>
            {q.trim() ? (
              <button type="button" className="btn btn-secondary" onClick={() => setQ("")}>
                Clear search
              </button>
            ) : (
              tab !== "all" && (
                <button type="button" className="btn btn-secondary" onClick={() => selectTab("all")}>
                  Show all enquiries
                </button>
              )
            )}
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {shown.map((e) => (
              <li key={e.id}>
                <EnquiryCard e={e} />
              </li>
            ))}
          </ul>
        )}

        {remaining > 0 && (
          <div className="loadmore">
            <div className="loadmore-progress" aria-hidden="true">
              <span style={{ transform: `scaleX(${shown.length / visible.length})` }} />
            </div>
            <p className="loadmore-text">
              {shown.length} / {visible.length}
            </p>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => setLimit((n) => n + PAGE)}>
              Show {Math.min(PAGE, remaining)} more · {remaining} remaining
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ card */

function EnquiryCard({ e }: { e: Enquiry }) {
  const hid = useId();
  const lines = e.product ? parseProductLines(e.product) : null;
  const totalPacks = lines?.reduce((sum, l) => sum + (l.qty ?? 0), 0) ?? 0;
  const org = [e.company, e.country].filter(Boolean).join(" · ");
  const tel = e.phone ? e.phone.replace(/[^\d+]/g, "") : "";
  const page = e.page && e.page.startsWith("/") && !e.page.startsWith("//") ? e.page : null;

  return (
    <article className={`panel${e.status === "new" ? " border-l-4 border-l-navy-900" : ""}`} aria-labelledby={hid}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id={hid} className="break-words text-h4 font-sans tracking-normal">
            {e.name}
          </h2>
          {org && <p className="text-fg-muted">{org}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={e.status} />
          <span className="badge border-transparent bg-navy-50 text-navy-900">
            <span className="sr-only">Source: </span>
            {e.source}
          </span>
          <LocalTime iso={e.created_at} />
        </div>
      </header>

      <ul className="mt-2 flex flex-wrap gap-x-6" aria-label="Contact details">
        <li>
          <a
            href={`mailto:${e.email}`}
            className="inline-flex min-h-[44px] items-center gap-2 break-all font-medium text-navy-600 underline decoration-transparent underline-offset-4 hover:decoration-current"
          >
            <Mail aria-hidden="true" className="h-[18px] w-[18px] flex-none" />
            {e.email}
          </a>
        </li>
        {e.phone && (
          <li>
            {tel ? (
              <a
                href={`tel:${tel}`}
                className="inline-flex min-h-[44px] items-center gap-2 font-medium text-navy-600 underline decoration-transparent underline-offset-4 hover:decoration-current"
              >
                <Phone aria-hidden="true" className="h-[18px] w-[18px] flex-none" />
                {e.phone}
              </a>
            ) : (
              <span className="inline-flex min-h-[44px] items-center gap-2">
                <Phone aria-hidden="true" className="h-[18px] w-[18px] flex-none" />
                {e.phone}
              </span>
            )}
          </li>
        )}
      </ul>

      {e.product && (
        <section className="mt-4" aria-labelledby={`${hid}-p`}>
          {lines ? (
            <>
              <h3 id={`${hid}-p`} className="kicker">
                {lines.length} product{lines.length === 1 ? "" : "s"}
                {totalPacks > 0 && ` · ${totalPacks} pack${totalPacks === 1 ? "" : "s"}`}
              </h3>
              <ol className="mt-2 border-t border-navy-900">
                {lines.map((l, i) => (
                  <li
                    key={i}
                    className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-rule py-2.5"
                  >
                    <span aria-hidden="true" className="font-mono text-sm text-fg-muted">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="font-semibold text-fg-strong">{l.title}</span>
                      {l.meta && <span className="block text-sm text-fg-muted">{l.meta}</span>}
                    </span>
                    {l.packs ? <span className="badge badge-code">{l.packs}</span> : <span />}
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <>
              <h3 id={`${hid}-p`} className="kicker">
                Product
              </h3>
              <p className="mt-1 break-words font-medium text-fg-strong">{e.product}</p>
            </>
          )}
        </section>
      )}

      {e.message && (
        <section className="mt-4" aria-labelledby={`${hid}-m`}>
          <h3 id={`${hid}-m`} className="kicker">
            Message
          </h3>
          <p className="mt-2 max-w-[80ch] whitespace-pre-wrap break-words rounded border border-rule bg-paper p-4 text-fg">
            {e.message}
          </p>
        </section>
      )}

      {page && (
        <p className="meta mt-3">
          Sent from <span className="font-mono">{page}</span>
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-rule pt-4">
        <a href={`mailto:${e.email}?subject=${encodeURIComponent("Re: your enquiry")}`} className="btn btn-primary btn-sm">
          <Reply aria-hidden="true" />
          Reply by email
          <span className="sr-only"> to {e.name}</span>
        </a>
        <EnquiryRowActions id={e.id} status={e.status} name={e.name} className="flex-1" />
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: EnquiryStatus }) {
  if (status === "new") {
    return (
      <span className="badge border-navy-900 bg-navy-900 text-white">
        <span className="sr-only">Status: </span>New
      </span>
    );
  }
  if (status === "read") {
    return (
      <span className="badge border-rule-strong">
        <span className="sr-only">Status: </span>Read
      </span>
    );
  }
  return (
    <span className="badge badge-mto">
      <span className="sr-only">Status: </span>Archived
    </span>
  );
}

/* ------------------------------------------------------------- helpers */

type ProductLine = { title: string; meta: string | null; packs: string | null; qty: number | null };

const INDEX_RE = /^\d+[.)]\s*/;
const PACKS_RE = /\s+[—–-]\s+(\d+)\s+packs?\s*$/i;

/**
 * Parse the stored product field. Enquiry-list submissions arrive as numbered
 * lines, e.g. "1. Cenforce 100 mg (Sildenafil Citrate, Tablets) — 10 packs".
 * Returns null for a plain single-line product (contact form / legacy rows).
 */
function parseProductLines(product: string): ProductLine[] | null {
  const raw = product
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (raw.length === 0) return null;
  const isList = raw.length > 1 || (INDEX_RE.test(raw[0]) && PACKS_RE.test(raw[0]));
  if (!isList) return null;

  return raw.map((line) => {
    let s = line.replace(INDEX_RE, "");
    let packs: string | null = null;
    let qty: number | null = null;
    const pm = s.match(PACKS_RE);
    if (pm && pm.index !== undefined) {
      qty = Number(pm[1]);
      packs = `${qty} pack${qty === 1 ? "" : "s"}`;
      s = s.slice(0, pm.index).trim();
    }
    let meta: string | null = null;
    const mm = s.match(/^(.*\S)\s*\(([^()]*)\)$/);
    if (mm) {
      s = mm[1];
      meta = mm[2] || null;
    }
    return { title: s, meta, packs, qty };
  });
}

const pad2 = (n: number) => String(n).padStart(2, "0");
/** "2026-09-28 14:05 UTC": built by hand so server and client output match exactly. */
const utcStamp = (d: Date) =>
  `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(
    d.getUTCMinutes(),
  )} UTC`;

/**
 * Timestamp: renders a deterministic UTC string on the server (so hydration
 * matches), then switches to the admin's own locale and time zone.
 */
function LocalTime({ iso }: { iso: string }) {
  const [local, setLocal] = useState<string | null>(null);
  const d = new Date(iso);
  const valid = !Number.isNaN(d.getTime());

  useEffect(() => {
    if (!valid) return;
    setLocal(new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)));
  }, [iso, valid]);

  if (!valid) return <span className="meta">{iso}</span>;
  return (
    <time dateTime={iso} className="meta whitespace-nowrap" title={utcStamp(d)}>
      {local ?? utcStamp(d)}
    </time>
  );
}
