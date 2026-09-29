import { adminGetEnquiryInbox } from "@/lib/admin/data";
import { EnquiryInbox, type InboxTab } from "@/components/admin/enquiry-inbox";

export const metadata = { title: "Enquiries" };

const TAB_KEYS: InboxTab[] = ["all", "new", "read", "archived"];

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ enquiries, total, newTotal }, sp] = await Promise.all([
    adminGetEnquiryInbox(),
    searchParams,
  ]);
  const initialTab = TAB_KEYS.find((k) => k === sp.status) ?? "all";

  return (
    <div>
      <header>
        <p className="kicker">Inbox</p>
        <h1 className="mt-2 text-h2">Enquiries</h1>
        <p className="mt-2 text-fg-muted">
          <span className="font-mono">{total}</span> received ·{" "}
          <span className="font-mono">{newTotal}</span> new
        </p>
        {total > enquiries.length ? (
          <p className="mt-1 text-sm text-fg-muted">
            Showing the latest <span className="font-mono">{enquiries.length}</span> of{" "}
            <span className="font-mono">{total}</span>. Archive or delete older enquiries to see the
            rest.
          </p>
        ) : null}
      </header>

      <div className="mt-8">
        <EnquiryInbox enquiries={enquiries} initialTab={initialTab} />
      </div>
    </div>
  );
}
