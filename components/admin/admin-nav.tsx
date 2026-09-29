"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/medicines", label: "Medicines", exact: false },
  { href: "/admin/enquiries", label: "Enquiries", exact: false },
] as const;

/**
 * Admin section tabs. Marks the current section with aria-current="page"
 * (.tab draws the 3px navy underline) and shows the number of new enquiries.
 */
export function AdminNav({
  newEnquiries = 0,
  className = "",
}: {
  newEnquiries?: number;
  className?: string;
}) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Admin" className={className}>
      <ul className="tabs border-b-0">
        {ITEMS.map((item) => {
          const current = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const showCount = item.href === "/admin/enquiries" && newEnquiries > 0;
          return (
            <li key={item.href} className="flex flex-none">
              <Link
                href={item.href}
                className="tab min-h-[56px] px-3 sm:px-4"
                aria-current={current ? "page" : undefined}
              >
                {item.label}
                {showCount && (
                  <>
                    <span className="count-badge" aria-hidden="true">
                      {newEnquiries}
                    </span>
                    <span className="sr-only">, {newEnquiries} new</span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
