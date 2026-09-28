import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { Logo } from "@/components/logo";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { email } = await requireAdmin();

  return (
    <div className="container-page py-8 lg:py-10">
      <div className="card mb-8 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Logo />
          <span className="hidden h-8 w-px bg-brand-100 sm:block" />
          <nav className="flex flex-wrap gap-1 text-sm">
            <AdminLink href="/admin">Dashboard</AdminLink>
            <AdminLink href="/admin/medicines">Medicines</AdminLink>
            <AdminLink href="/admin/enquiries">Enquiries</AdminLink>
          </nav>
        </div>
        <div className="flex items-center gap-2 text-sm sm:gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
          >
            View site
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          {email && (
            <span className="hidden rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 lg:inline">
              {email}
            </span>
          )}
          <form action="/auth/signout" method="post">
            <button className="btn btn-outline px-3 py-1.5">Sign out</button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}

function AdminLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
    >
      {children}
    </Link>
  );
}
