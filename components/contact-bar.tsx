import { Mail, Phone } from "lucide-react";
import { SocialIcon } from "@/components/social-icon";
import { contact, site, whatsappLink } from "@/lib/site";

/** Written out in full so the stylesheet keeps the rules that hide channels on narrow screens. */
const CHANNEL_CLASS: Record<(typeof site.social)[number]["name"], string> = {
  Telegram: "utility-ch-telegram",
  Instagram: "utility-ch-instagram",
  Facebook: "utility-ch-facebook",
};

/** "+91 91850 81244" -> ["+91", "91850 81244"], so the country code can step aside on phones. */
function splitCode(phone: string): [string | null, string] {
  const m = phone.match(/^(\+\d+)\s+(.+)$/);
  return m ? [m[1]!, m[2]!] : [null, phone];
}

/**
 * Thin strip above the header on every public page: both phone numbers, WhatsApp and the social
 * channels, so a buyer can reach the desk from anywhere. The numbers show at every width; what
 * gives way as the screen narrows is the rest (globals.css, "Contact bar"): channel names become
 * icons below 1024px, the "+91" is spoken but not shown below 640px, Instagram and Facebook step
 * out below 480px and Telegram below 360px (all three stay in the footer and the phone menu). The
 * email address needs a wide screen (1440px up); it is in the footer and on Contact for everyone.
 */
export function ContactBar() {
  const wa = whatsappLink();
  const phones: { number: string; href: string }[] = [];
  if (contact.phone && contact.phoneHref) phones.push({ number: contact.phone, href: contact.phoneHref });
  if (contact.phone2 && contact.phone2Href) phones.push({ number: contact.phone2, href: contact.phone2Href });
  if (!phones.length && !wa && !contact.email && !site.social.length) return null;

  return (
    <div className="utility-bar">
      <div className="container-grid utility-bar-inner">
        {phones.map((p) => {
          const [code, rest] = splitCode(p.number);
          return (
            <a key={p.href} className="utility-link utility-tel" href={p.href}>
              <Phone aria-hidden strokeWidth={1.75} />
              <span>
                {code && <span className="utility-cc">{code} </span>}
                {rest}
              </span>
            </a>
          );
        })}
        {wa && (
          <a className="utility-link" href={wa} target="_blank" rel="noopener noreferrer">
            <SocialIcon name="WhatsApp" />
            <span className="utility-label">WhatsApp</span>
          </a>
        )}
        {site.social.map((s) => (
          <a
            key={s.name}
            className={`utility-link ${CHANNEL_CLASS[s.name]}`}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <SocialIcon name={s.name} />
            <span className="utility-label">{s.name}</span>
          </a>
        ))}
        {contact.email && (
          <a className="utility-link utility-mail" href={`mailto:${contact.email}`}>
            <Mail aria-hidden strokeWidth={1.75} />
            <span>{contact.email}</span>
          </a>
        )}
        <span className="utility-hours">{site.deskHours}</span>
      </div>
    </div>
  );
}
