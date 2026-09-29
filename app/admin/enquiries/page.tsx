import { adminGetEnquiries } from "@/lib/admin/data";
import { EnquiryInbox, type InboxTab } from "@/components/admin/enquiry-inbox";

export const metadata = { title: "Enquiries" };

const TAB_KEYS: InboxTab[] = ["all", "new", "read", "archived"];

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [enquiries, sp] = await Promise.all([adminGetEnquiries(), searchParams]);
  const initialTab = TAB_KEYS.find((k) => k === sp.status) ?? "all";
  const newCount = enquiries.filter((e) => e.status === "new").length;

  return (
    <div>
      <header>
        <p className="kicker">Inbox</p>
        <h1 className="mt-2 text-h2">Enquiries</h1>
        <p className="mt-2 text-fg-muted">
          <span className="font-mono">{enquiries.length}</span> received ·{" "}
          <span className="font-mono">{newCount}</span> new
        </p>
      </header>

      <div className="mt-8">
        <EnquiryInbox enquiries={enquiries} initialTab={initialTab} />
      </div>
    </div>
  );
}
