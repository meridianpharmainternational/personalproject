import Link from "next/link";
import { Mail, Phone, MapPin, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { site, whatsappLink } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();
  const wa = whatsappLink();

  return (
    <footer className="relative mt-20 overflow-hidden bg-brand-900 text-brand-100">
      <div className="h-1 w-full bg-gradient-to-r from-brand-500 via-teal-500 to-leaf-500" />

      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2">
          <Logo variant="dark" />
          <p className="mt-5 max-w-md text-sm leading-relaxed text-brand-200">
            {site.description}
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-leaf-400" />
              <a href={`mailto:${site.email}`} className="footer-link">
                {site.email}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-leaf-400" /> {site.phone}
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-leaf-400" />
              <span className="text-brand-200">{site.address}</span>
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            {site.certifications.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-leaf-400" />
                {c}
              </span>
            ))}
          </div>
        </div>

        <FooterCol title="Explore" links={site.nav} />
        <FooterCol title="Legal" links={site.legal} />

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
            Get in touch
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/contact" className="footer-link">
                Send an enquiry
              </Link>
            </li>
            {wa && (
              <li>
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link"
                >
                  WhatsApp
                </a>
              </li>
            )}
            <li>
              <Link href="/medicines" className="footer-link">
                Browse medicines
              </Link>
            </li>
            <li>
              <Link href="/login" className="footer-link text-brand-300">
                Admin
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-brand-300 sm:flex-row">
          <p>
            © {year} {site.fullName}. All rights reserved.
          </p>
          <p className="max-w-xl sm:text-right">
            Disclaimer: B2B information only. Product availability and legal
            status vary by country.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="footer-link">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
