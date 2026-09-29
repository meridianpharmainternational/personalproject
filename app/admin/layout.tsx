import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { adminCounts } from "@/lib/admin/data";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Admin chrome. The site header already renders above (its search and enquiry
 * list are hidden in the staff area), so this adds only a secondary band:
 * "Admin" kicker · section tabs · signed-in email · View site · Sign out.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { email } = await requireAdmin();
  const counts = await adminCounts();

  return (
    <>
      <div className="surface-paper border-t-0">
        <div className="container-grid flex flex-wrap items-center gap-x-6">
          <p className="kicker order-1 py-3 lg:py-0">Admin</p>

          <AdminNav
            newEnquiries={counts.newEnquiries}
            className="order-3 -ml-3 w-full sm:-ml-4 lg:order-2 lg:ml-0 lg:w-auto"
          />

          <div className="order-2 ml-auto flex items-center gap-2 py-1.5 lg:order-3">
            {email && (
              <p className="hidden max-w-[18rem] truncate text-sm text-fg-muted md:block" title={email}>
                <span className="sr-only">Signed in as </span>
                {email}
              </p>
            )}
            <Link href="/" className="btn btn-ghost btn-sm">
              View site
              <ArrowUpRight aria-hidden="true" />
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn btn-secondary btn-sm">
                <LogOut aria-hidden="true" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="container-grid py-8">{children}</div>
    </>
  );
}
