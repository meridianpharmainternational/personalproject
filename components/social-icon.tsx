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
