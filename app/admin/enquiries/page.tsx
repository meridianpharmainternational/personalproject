import {
  Mail,
  Phone,
  Building2,
  Globe2,
  Package,
  Clock,
  Inbox,
} from "lucide-react";
import { adminGetEnquiries } from "@/lib/admin/data";
import { EnquiryRowActions } from "@/components/admin/enquiry-row-actions";
import type { EnquiryStatus } from "@/types/db";

export const metadata = { title: "Enquiries" };

export default async function AdminEnquiriesPage() {
  const enquiries = await adminGetEnquiries();

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="tile-icon g1">
          <Inbox className="h-6 w-6" />
        </span>
        <div>
          <span className="eyebrow">
            <span className="dot" />
            Inbox
          </span>
          <h2 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-brand-900">
            Enquiries{" "}
            <span className="gradient-text">({enquiries.length})</span>
          </h2>
        </div>
      </div>

      {enquiries.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <span className="tile-icon g3 mx-auto">
            <Inbox className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm text-slate-500">
            No enquiries yet. Submissions from the contact form and product
            &ldquo;Enquire&rdquo; buttons will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {enquiries.map((e, i) => (
            <div
              key={e.id}
              className={`card p-5 reveal ${i % 3 ? `reveal-d${i % 3}` : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {/* Header: name · status · timestamp */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-semibold text-brand-900">
                      {e.name}
                    </span>
                    <StatusBadge status={e.status} />
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* Contact line */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
                    <a
                      href={`mailto:${e.email}`}
                      className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5 text-brand-500" />
                      {e.email}
                    </a>
                    {e.phone && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {e.phone}
                      </span>
                    )}
                    {e.company && (
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {e.company}
                      </span>
                    )}
                    {e.country && (
                      <span className="inline-flex items-center gap-1.5">
                        <Globe2 className="h-3.5 w-3.5 text-slate-400" />
                        {e.country}
                      </span>
                    )}
                  </div>

                  {/* Product chip */}
                  {e.product && (
                    <div className="mt-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
                        <Package className="h-3.5 w-3.5" />
                        {e.product}
                      </span>
                    </div>
                  )}

                  {/* Message box */}
                  {e.message && (
                    <p className="mt-3 whitespace-pre-wrap rounded-lg bg-brand-50/40 p-3 text-sm text-slate-700">
                      {e.message}
                    </p>
                  )}

                  {/* Footer meta */}
                  <div className="mt-3 text-xs text-slate-400">
                    via {e.source}
                    {e.page ? ` · ${e.page}` : ""}
                  </div>
                </div>

                <EnquiryRowActions id={e.id} status={e.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: EnquiryStatus }) {
  const map: Record<EnquiryStatus, string> = {
    new: "bg-brand-100 text-brand-800",
    read: "bg-slate-100 text-slate-600",
    archived: "bg-slate-100 text-slate-400",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${map[status]}`}
    >
      {status}
    </span>
  );
}
