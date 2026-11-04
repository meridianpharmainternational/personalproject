import { Phone } from "lucide-react";
import { SocialIcon } from "@/components/social-icon";
import { contact, site, whatsappLink } from "@/lib/site";

/**
 * Thin strip above the header on every public page: the phone number, WhatsApp and the social
 * channels, so a buyer can reach the desk from anywhere. Below 640px the channel names drop to
 * icons (labels stay for screen readers); under 360px the number does too.
 */
export function ContactBar() {
  const wa = whatsappLink();
  if (!contact.phoneHref && !wa && !site.social.length) return null;

  return (
    <div className="utility-bar">
      <div className="container-grid utility-bar-inner">
        {contact.phoneHref && (
          <a className="utility-link" href={contact.phoneHref}>
            <Phone aria-hidden strokeWidth={1.75} />
            <span className="utility-phone">{contact.phone}</span>
          </a>
        )}
        {wa && (
          <a className="utility-link" href={wa} target="_blank" rel="noopener noreferrer">
            <SocialIcon name="WhatsApp" />
            <span className="utility-label">WhatsApp</span>
          </a>
        )}
        {site.social.map((s) => (
          <a key={s.name} className="utility-link" href={s.href} target="_blank" rel="noopener noreferrer">
            <SocialIcon name={s.name} />
            <span className="utility-label">{s.name}</span>
          </a>
        ))}
        <span className="utility-hours">{site.deskHours}</span>
      </div>
    </div>
  );
}
