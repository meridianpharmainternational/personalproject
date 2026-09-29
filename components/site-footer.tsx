import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import logo from "@/app/assets/logo.png";
import type { NavData } from "@/components/category-bar";
import { OpenEnquiryButton } from "@/components/enquiry/open-enquiry-button";
import { contact, site, whatsappLink } from "@/lib/site";

export function SiteFooter({ nav }: { nav: NavData }) {
  const year = new Date().getFullYear();
  const wa = whatsappLink();
  // A total of 0 means the catalogue couldn't load: show no counts rather than "0".
  const showCounts = nav.total > 0;

  return (
    <footer className="site-footer bg-columns">
      <div className="scale-rule" aria-hidden />

      <div className="container-grid py-16">
        {/* Closing row */}
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <h2 className="lg:col-span-7">Have a product list? Send it in one enquiry.</h2>
          <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
            <OpenEnquiryButton className="btn btn-enquire btn-lg w-full sm:w-auto" label="Open enquiry list" />
            {contact.email ? (
              <a className="btn btn-outline-inverse btn-lg w-full sm:w-auto" href={`mailto:${contact.email}`}>
                Email the exports team
              </a>
            ) : (
              <Link className="btn btn-outline-inverse btn-lg w-full sm:w-auto" href="/contact">
                Contact the exports team
              </Link>
            )}
          </div>
        </div>

        <div className="scale-rule mt-12" aria-hidden />

        {/* Columns */}
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            {/* The 3:2 artwork is cropped to a 988px square around its own ring (x 273–1261, y 13–1001 of
                1536×1024), so the ring fills the 128px disc and the wordmark stays legible (~88px wide).
                Image width = 1536/988 of the disc; offsets = -273/988 and -13/988 of the disc. */}
            <span className="logo-disc">
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
            <div className="mt-4 flex flex-wrap gap-2">
              {site.certifications.map((c) => (
                <span key={c} className="badge badge-cert">
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="footer-heading">Products</p>
            <ul>
              <li>
                <Link className="footer-link" href="/medicines">
                  All products{" "}
                  {showCounts && <span className="font-mono text-sm text-on-dark-subtle">{nav.total}</span>}
                </Link>
              </li>
              {nav.categories.map((c) => (
                <li key={c.slug}>
                  <Link className="footer-link" href={`/medicines?category=${c.slug}`}>
                    {c.name}{" "}
                    {showCounts && <span className="font-mono text-sm text-on-dark-subtle">{c.count}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="footer-heading">Company</p>
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
              <li>
                <Link className="footer-link" href="/contact">
                  Send us a message
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-legal">
        <div className="container-grid flex flex-wrap items-center gap-x-6 gap-y-1 py-6">
          <span className="py-3">
            © {year} {site.fullName}
          </span>
          {site.legal.map((l) => (
            <Link key={l.href} className="footer-link" href={l.href}>
              {l.label}
            </Link>
          ))}
          <span className="py-3 lg:ml-auto">
            Products are supplied only to licensed importers and distributors, subject to destination-country
            regulations.
          </span>
        </div>
      </div>
    </footer>
  );
}
