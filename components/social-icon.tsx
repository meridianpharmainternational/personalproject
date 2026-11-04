import { MessageCircle, Send } from "lucide-react";

export type SocialName = "WhatsApp" | "Telegram" | "Instagram" | "Facebook";

/**
 * One icon per channel in lucide's line style (24px grid, 2px stroke). lucide-react no longer
 * ships brand marks, so Instagram and Facebook are drawn here; Telegram uses the paper plane and
 * WhatsApp the speech bubble, as the rest of the site already does.
 */
export function SocialIcon({ name, className }: { name: SocialName; className?: string }) {
  if (name === "Telegram") return <Send aria-hidden className={className} />;
  if (name === "WhatsApp") return <MessageCircle aria-hidden className={className} />;
  return (
    <svg
      aria-hidden
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "Instagram" ? (
        <>
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </>
      ) : (
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      )}
    </svg>
  );
}

/* Filled glyphs (lucide outlines used as solid shapes) for the brand discs below. */
const HANDSET =
  "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z";
const BUBBLE = "M7.9 20A9 9 0 1 0 4 16.1L2 22Z";
const PLANE = "m22 2-7 20-4-9-9-4Z";

/**
 * Round, brand-coloured marks for the hero's quick-contact row (the owner wanted the WhatsApp
 * and Telegram logos there rather than names): WhatsApp green with a bubble and handset,
 * Telegram blue with the paper plane, and a white disc with a navy handset for the phone.
 */
export function BrandMark({ name, className }: { name: "Phone" | "WhatsApp" | "Telegram"; className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
    >
      {name === "Phone" && (
        <>
          <circle cx="12" cy="12" r="12" fill="#fff" />
          <path d={HANDSET} fill="#0f2350" transform="translate(6 6) scale(.5)" />
        </>
      )}
      {name === "WhatsApp" && (
        <>
          <circle cx="12" cy="12" r="12" fill="#25d366" />
          <path d={BUBBLE} fill="#fff" transform="translate(4.6 4.6) scale(.62)" />
          <path d={HANDSET} fill="#25d366" transform="translate(8.8 8.6) scale(.28)" />
        </>
      )}
      {name === "Telegram" && (
        <>
          <circle cx="12" cy="12" r="12" fill="#26a5e4" />
          <g transform="translate(5.2 5.6) scale(.56)">
            <path d={PLANE} fill="#fff" />
            <path d="M22 2 11 13" stroke="#26a5e4" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        </>
      )}
    </svg>
  );
}
