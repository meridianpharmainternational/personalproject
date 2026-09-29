import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Boxes, CheckCircle2, Inbox, MailOpen } from "lucide-react";
import { adminCounts } from "@/lib/admin/data";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const counts = await adminCounts();
  const hidden = Math.max(0, counts.medicines - counts.activeMedicines);

  return (
    <div>
      <header>
        <p className="kicker">Overview</p>
        <h1 className="mt-2 text-h2">Dashboard</h1>
      </header>

      <section aria-labelledby="stats-title" className="mt-8">
        <h2 id="stats-title" className="sr-only">
          At a glance
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Medicines"
            value={counts.medicines}
            caption="In the catalogue, including hidden"
            icon={<Boxes aria-hidden="true" />}
          />
          <Stat
            label="Active"
            value={counts.activeMedicines}
            caption={`Visible on the site · ${hidden} hidden`}
            icon={<CheckCircle2 aria-hidden="true" />}
          />
          <Stat
            label="Enquiries"
            value={counts.enquiries}
            caption="Received, all time"
            icon={<Inbox aria-hidden="true" />}
          />
          <Stat
            label="New enquiries"
            value={counts.newEnquiries}
            caption={counts.newEnquiries > 0 ? "Awaiting review" : "Inbox is clear"}
            icon={<MailOpen aria-hidden="true" />}
            highlight={counts.newEnquiries > 0}
            href={counts.newEnquiries > 0 ? "/admin/enquiries?status=new" : undefined}
            linkLabel={`Review ${counts.newEnquiries} new`}
          />
        </dl>
      </section>

      <section aria-labelledby="shortcuts-title" className="mt-10">
        <h2 id="shortcuts-title" className="sr-only">
          Shortcuts
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="panel flex flex-col">
            <p className="kicker">Catalogue</p>
            <h3 className="mt-2 text-h4">Manage medicines</h3>
            <p className="mt-2 text-fg-muted">
              Add, edit, hide or remove products in the public catalogue. {counts.medicines} in total,{" "}
              {counts.activeMedicines} visible.
            </p>
            <div className="mt-auto flex flex-wrap gap-x-6 pt-4">
              <Link href="/admin/medicines" className="link-arrow">
                All medicines
                <ArrowRight aria-hidden="true" className="icon-trail" />
              </Link>
              <Link href="/admin/medicines/new" className="link-arrow">
                Add a medicine
                <ArrowRight aria-hidden="true" className="icon-trail" />
              </Link>
            </div>
          </div>

          <div className="panel flex flex-col">
            <p className="kicker">Inbox</p>
            <h3 className="mt-2 text-h4">Review enquiries</h3>
            <p className="mt-2 text-fg-muted">
              Read, reply to and archive enquiries from the enquiry list and the contact form.{" "}
              {counts.newEnquiries} new of {counts.enquiries}.
            </p>
            <div className="mt-auto flex flex-wrap gap-x-6 pt-4">
              <Link href="/admin/enquiries" className="link-arrow">
                Open inbox
                <ArrowRight aria-hidden="true" className="icon-trail" />
              </Link>
              {counts.newEnquiries > 0 && (
                <Link href="/admin/enquiries?status=new" className="link-arrow">
                  New only
                  <ArrowRight aria-hidden="true" className="icon-trail" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  caption,
  icon,
  highlight = false,
  href,
  linkLabel,
}: {
  label: string;
  value: number;
  caption: string;
  icon: ReactNode;
  highlight?: boolean;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div
      className={
        highlight
          ? "panel surface-dark flex flex-col border-navy-900 bg-navy-900"
          : "panel flex flex-col"
      }
    >
      <dt className="flex items-start justify-between gap-3">
        <span className={highlight ? "kicker !text-on-dark-subtle" : "kicker"}>{label}</span>
        <span className={`[&>svg]:h-5 [&>svg]:w-5 ${highlight ? "text-on-dark-subtle" : "text-navy-700"}`}>{icon}</span>
      </dt>
      <dd className="mt-4">
        <span
          className={`block font-mono text-[2.25rem] font-medium leading-none tracking-tight tabular-nums lg:text-[3.25rem] ${
            highlight ? "text-white" : "text-fg-strong"
          }`}
        >
          {value}
        </span>
        <span className={`mt-3 block text-sm ${highlight ? "text-on-dark-muted" : "text-fg-muted"}`}>{caption}</span>
        {href && linkLabel && (
          <Link href={href} className="link-arrow mt-1">
            {linkLabel}
            <ArrowRight aria-hidden="true" className="icon-trail" />
          </Link>
        )}
      </dd>
    </div>
  );
}
