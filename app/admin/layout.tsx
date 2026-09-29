import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { adminCounts } from "@/lib/admin/data";
import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";

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
  // The admin check and the nav counts run in parallel: a failed check still
  // redirects, and its counts are never shown. A counts failure only drops the
  // nav badge; it must not take the admin chrome (View site, Sign out) down
  // with it. The page's own read still throws into the (admin) error boundary.
  const [{ email }, counts] = await Promise.all([requireAdmin(), adminCounts().catch(() => null)]);

  return (
    <>
      <div className="surface-paper border-t-0">
        <div className="container-grid flex flex-wrap items-center gap-x-6">
          <p className="kicker order-1 py-3 lg:py-0">Admin</p>

          <AdminNav
            newEnquiries={counts?.newEnquiries}
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
            <SignOutButton />
          </div>
        </div>
      </div>

      <div className="container-grid py-8">{children}</div>
    </>
  );
}
