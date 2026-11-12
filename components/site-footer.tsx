import Image from "next/image";
import Link from "next/link";
import { Mail, MessageCircle, Phone, ShoppingBag } from "lucide-react";
import logo from "@/app/assets/logo.png";
import { SocialIcon } from "@/components/social-icon";
import { contact, site, whatsappLink } from "@/lib/site";

/**
 * Quiet footer: brand and export reach, the site's main links, the payments we accept, contact details
 * (only once real ones are set in lib/site.ts) and the legal line.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  const wa = whatsappLink();
  const hasDirect = Boolean(contact.email || contact.phoneHref || wa || site.social.length);

  return (
    <footer className="site-footer">
      <div className="container-grid grid grid-cols-2 gap-x-6 gap-y-10 py-14 lg:grid-cols-4">
        <div className={hasDirect ? "col-span-2 lg:col-span-1" : "col-span-2"}>
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
            Licensed pharmaceutical exporter supplying importers and distributors across five continents, with{" "}
            {site.exportReach.short}.
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

        <div>
          <p className="footer-heading">Payments we accept</p>
          <ul className="space-y-1 pt-2 text-on-dark-muted">
            {site.payments.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        {hasDirect && (
          /* Full width on phones: the email address needs the room. */
          <div className="col-span-2 lg:col-span-1">
            <p className="footer-heading">Contact</p>
            <ul>
              {contact.email && contact.emailParts && (
                <li>
                  <a className="footer-link" href={`mailto:${contact.email}`}>
                    <Mail aria-hidden className="h-4 w-4 flex-none" />{" "}
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      {contact.emailParts[0]}@<wbr />
                      {contact.emailParts[1]}
                    </span>
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
              {contact.phone2Href && (
                <li>
                  <a className="footer-link" href={contact.phone2Href}>
                    <Phone aria-hidden className="h-4 w-4" /> {contact.phone2}
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
              {site.social.map((s) => (
                <li key={s.name}>
                  <a className="footer-link" href={s.href} target="_blank" rel="noopener noreferrer">
                    <SocialIcon name={s.name} className="h-4 w-4" /> {s.name}
                  </a>
                </li>
              ))}
              <li>
                <a className="footer-link" href={site.store.href} target="_blank" rel="noopener">
                  <ShoppingBag aria-hidden className="h-4 w-4" /> {site.store.name}
                </a>
              </li>
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
