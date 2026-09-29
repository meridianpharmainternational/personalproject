import Image from "next/image";
import Link from "next/link";
import logoMark from "@/app/assets/logo-mark.png";
import { site } from "@/lib/site";

/**
 * Brand lockup: the logo MARK (M + globe + swoosh + aircraft, cropped so it is
 * legible at 40px) + a serif "MERIDIAN" wordmark echoing the logo.
 * The full circular logo is only used large (footer), where its inner
 * wordmark is readable.
 */
export function Logo({
  variant = "light",
  className = "",
}: {
  variant?: "light" | "dark";
  className?: string;
}) {
  return (
    <Link href="/" className={`brand ${className}`} aria-label={`${site.fullName}, home`}>
      <Image src={logoMark} alt="" className="brand-mark" priority />
      <span>
        <span className="brand-name" style={variant === "dark" ? { color: "#fff" } : undefined}>
          MERIDIAN
        </span>
        <span className="brand-sub" style={variant === "dark" ? { color: "var(--leaf-300)" } : undefined}>
          Pharma International
        </span>
      </span>
    </Link>
  );
}
