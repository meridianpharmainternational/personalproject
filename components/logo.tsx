import Image from "next/image";
import Link from "next/link";
import logo from "@/app/assets/logo.png";
import { site } from "@/lib/site";

/**
 * Brand lockup: the circular emblem in a white chip + wordmark. `variant`
 * controls text colour for light (header) vs dark (footer) backgrounds.
 */
export function Logo({
  variant = "light",
  className = "",
}: {
  variant?: "light" | "dark";
  className?: string;
}) {
  const word = variant === "dark" ? "text-white" : "text-brand-900";
  const sub = variant === "dark" ? "text-leaf-300" : "text-leaf-700";

  return (
    <Link
      href="/"
      aria-label={`${site.fullName} — home`}
      className={`group inline-flex items-center gap-2.5 ${className}`}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-soft ring-1 ring-black/5 transition group-hover:scale-105">
        <Image
          src={logo}
          alt=""
          width={44}
          height={44}
          className="h-10 w-10 object-contain"
          priority
        />
      </span>
      <span className="leading-tight">
        <span
          className={`block font-display text-lg font-extrabold tracking-tight ${word}`}
        >
          {site.name}
        </span>
        <span
          className={`block text-[0.6rem] font-semibold uppercase tracking-[0.16em] ${sub}`}
        >
          Pharma International
        </span>
      </span>
    </Link>
  );
}
