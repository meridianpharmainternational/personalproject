import "server-only";
import type { EnquiryInsert } from "@/types/db";

/**
 * OPTIONAL email notification for new enquiries, via Resend's REST API (no SDK
 * dependency needed). If RESEND_API_KEY and ENQUIRY_NOTIFY_EMAIL are not set,
 * this is a silent no-op — enquiries always land in the admin inbox regardless,
 * so email is purely a convenience layer you can switch on later.
 *
 * Env:
 *   RESEND_API_KEY        server-only API key from resend.com
 *   ENQUIRY_NOTIFY_EMAIL  where notifications are sent (your inbox)
 *   ENQUIRY_FROM_EMAIL    verified "from" address (defaults to Resend sandbox)
 */
export async function sendEnquiryNotification(
  enquiry: EnquiryInsert,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ENQUIRY_NOTIFY_EMAIL;
  const from =
    process.env.ENQUIRY_FROM_EMAIL || "Meridian <onboarding@resend.dev>";
  if (!apiKey || !to) return; // email disabled — the inbox is the source of truth

  const subject = enquiry.product
    ? `New enquiry: ${enquiry.product}`
    : `New enquiry from ${enquiry.name}`;

  const text = [
    `Source: ${enquiry.source}`,
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    enquiry.phone ? `Phone: ${enquiry.phone}` : null,
    enquiry.company ? `Company: ${enquiry.company}` : null,
    enquiry.country ? `Country: ${enquiry.country}` : null,
    enquiry.product ? `Product: ${enquiry.product}` : null,
    enquiry.page ? `Page: ${enquiry.page}` : null,
    "",
    enquiry.message || "(no message)",
  ]
    .filter((l) => l !== null)
    .join("\n");

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: enquiry.email,
        subject,
        text,
      }),
    });
  } catch {
    // Never let an email failure break the enquiry submission.
  }
}
