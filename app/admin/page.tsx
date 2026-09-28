import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Boxes, CheckCircle2, Inbox, Sparkles, Pill } from "lucide-react";
import { adminCounts } from "@/lib/admin/data";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const counts = await adminCounts();

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Medicines"
          value={counts.medicines}
          tone="g1"
          icon={<Boxes className="h-6 w-6" />}
          className="reveal"
        />
        <Stat
          label="Active"
          value={counts.activeMedicines}
          tone="g3"
          icon={<CheckCircle2 className="h-6 w-6" />}
          className="reveal reveal-d1"
        />
        <Stat
          label="Enquiries"
          value={counts.enquiries}
          tone="g2"
          icon={<Inbox className="h-6 w-6" />}
          className="reveal reveal-d2"
        />
        <Stat
          label="New enquiries"
          value={counts.newEnquiries}
          tone="g4"
          icon={<Sparkles className="h-6 w-6" />}
          highlight
          className="reveal reveal-d3"
        />
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <QuickLink
          href="/admin/medicines"
          icon={<Pill className="h-6 w-6" />}
          tone="g1"
          title="Manage medicines"
          body="Add, edit, or remove medicines from the public catalog."
          className="reveal"
        />
        <QuickLink
          href="/admin/enquiries"
          icon={<Inbox className="h-6 w-6" />}
          tone="g3"
          title="View enquiries"
          body="Read and triage enquiries submitted from the site."
          className="reveal reveal-d1"
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
  highlight,
  className = "",
}: {
  label: string;
  value: number;
  tone: string;
  icon: ReactNode;
  highlight?: boolean;
  className?: string;
}) {
  const active = highlight && value > 0;
  return (
    <div
      className={`card p-5 ${active ? "border-leaf-300 bg-leaf-50/50 ring-1 ring-leaf-200" : ""} ${className}`}
    >
      <span className={`tile-icon ${active ? "g5" : tone}`}>{icon}</span>
      <div
        className={`mt-4 font-display text-4xl font-extrabold tracking-tight ${active ? "text-leaf-700" : "text-brand-900"}`}
      >
        {value}
      </div>
      <div
        className={`mt-1 text-sm font-semibold ${active ? "text-leaf-700" : "text-slate-500"}`}
      >
        {label}
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  tone,
  title,
  body,
  className = "",
}: {
  href: string;
  icon: ReactNode;
  tone: string;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <Link href={href} className={`tile group p-6 ${className}`}>
      <span className={`tile-icon ${tone}`}>{icon}</span>
      <h2 className="mt-4 font-display text-lg font-bold text-brand-900">{title}</h2>
      <p className="mt-1.5 text-sm text-slate-600">{body}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
        Open{" "}
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
