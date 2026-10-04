import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import logo from "@/app/assets/logo.png";
import { contact, site, whatsappLink } from "@/lib/site";

/**
 * Quiet footer: brand, the site's main links, contact details (only once real ones are set in
 * lib/site.ts) and the legal line.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  const wa = whatsappLink();
  const hasDirect = Boolean(contact.email || contact.phoneHref || wa || contact.address);

  return (
    <footer className="site-footer">
      <div className="container-grid grid grid-cols-2 gap-x-6 gap-y-10 py-14 lg:grid-cols-4">
        <div className="col-span-2">
          {/* The 3:2 artwork is cropped to a square around its own ring (x 273–1261, y 13–1001 of
              1536×1024), so the ring fills the disc and the wordmark stays legible. */}
          <span className="logo-disc max-sm:h-24 max-sm:w-24">
            <Image
              src={logo}
              alt={site.fullName}
              width={199}
              height={133}
              className="absolute left-[-27.63%] top-[-1.32%] h-auto w-[155.47%] max-w-none"
            />
          </span>
          <p className="mt-4 max-w-xs">
            Licensed pharmaceutical exporter supplying importers and distributors worldwide.
          </p>
          <p className="mt-3 text-sm text-on-dark-subtle">{site.certifications.join(" · ")}</p>
        </div>

        <div>
          <p className="footer-heading">Quick links</p>
          <ul>
            {site.nav.map((i) => (
              <li key={i.href}>
                <Link className="footer-link" href={i.href}>
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {hasDirect && (
          <div>
            <p className="footer-heading">Contact</p>
            <ul>
              {contact.email && (
                <li>
                  <a className="footer-link" href={`mailto:${contact.email}`}>
                    <Mail aria-hidden className="h-4 w-4" /> {contact.email}
                  </a>
                </li>
              )}
              {contact.phoneHref && (
                <li>
                  <a className="footer-link" href={contact.phoneHref}>
                    <Phone aria-hidden className="h-4 w-4" /> {contact.phone}
                  </a>
                </li>
              )}
              {wa && (
                <li>
                  <a className="footer-link" href={wa} target="_blank" rel="noopener noreferrer">
                    <MessageCircle aria-hidden className="h-4 w-4" /> WhatsApp
                  </a>
                </li>
              )}
              {contact.address && (
                <li className="flex items-start gap-2 py-2">
                  <MapPin aria-hidden className="mt-1 h-4 w-4 flex-none" /> {contact.address}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="footer-legal">
        <div className="container-grid flex flex-wrap items-center gap-x-6 gap-y-1 py-5">
          {/* Its own line on phones, so the links never wrap in beside it. */}
          <span className="w-full py-3 sm:w-auto">
            © {year} {site.fullName}
          </span>
          {site.legal.map((l) => (
            <Link key={l.href} className="footer-link" href={l.href}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
