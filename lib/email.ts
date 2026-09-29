import "server-only";
import { after } from "next/server";
import type { EnquiryInsert } from "@/types/db";

/** How long the Resend request may take before it is abandoned. */
const SEND_TIMEOUT_MS = 5000;
/** Keep subjects comfortably short for mail clients and the API. */
const SUBJECT_MAX = 150;

/**
 * OPTIONAL email notification for new enquiries, via Resend's REST API (no SDK
 * dependency needed). If RESEND_API_KEY and ENQUIRY_NOTIFY_EMAIL are not set,
 * this is a silent no-op — enquiries always land in the admin inbox regardless,
 * so email is purely a convenience layer you can switch on later.
 *
 * The send is scheduled with Next's `after()` so the buyer's response never
 * waits on the mail service: inside a request (e.g. the enquiry server action)
 * this resolves immediately and the email goes out once the response has been
 * sent. Outside a request scope it falls back to sending inline. Either way it
 * never throws.
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

  const deliver = () => deliverNotification(enquiry, { apiKey, to, from });

  try {
    after(deliver);
  } catch {
    // Not inside a request scope (or waitUntil unavailable) — send inline.
    await deliver();
  }
}

/** Collapse CR/LF, tabs and other control characters into single spaces. */
function toSingleLine(value: string): string {
  return Array.from(value, (ch) => {
    const code = ch.charCodeAt(0);
    return code < 0x20 || code === 0x7f ? " " : ch;
  })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A single-line subject. The full (possibly multi-line) product list stays in
 * the body; line breaks are not allowed in a Subject header.
 */
function buildSubject(enquiry: EnquiryInsert): string {
  const who = `${enquiry.name}${enquiry.company ? ` (${enquiry.company})` : ""}`;
  const lines = (enquiry.product ?? "")
    .split(/\r?\n|\r/)
    .map((l) => l.trim())
    .filter(Boolean);

  let what = "";
  if (lines.length === 1) what = `: ${lines[0]}`;
  else if (lines.length > 1) what = `: ${lines.length} products`;

  const subject = toSingleLine(`New enquiry from ${who}${what}`);
  return subject.length > SUBJECT_MAX
    ? `${subject.slice(0, SUBJECT_MAX - 1).trimEnd()}…`
    : subject;
}

async function deliverNotification(
  enquiry: EnquiryInsert,
  config: { apiKey: string; to: string; from: string },
): Promise<void> {
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
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [config.to],
        reply_to: enquiry.email,
        subject: buildSubject(enquiry),
        text,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!res.ok) {
      let body = "";
      try {
        body = await res.text();
      } catch {
        // ignore — the status alone is enough to diagnose
      }
      console.error(
        `[email] Enquiry notification failed: ${res.status} ${res.statusText}`,
        body.slice(0, 1000),
      );
    }
  } catch (err) {
    // Never let an email failure break the enquiry submission.
    const reason =
      err instanceof Error && err.name === "TimeoutError"
        ? `timed out after ${SEND_TIMEOUT_MS}ms`
        : err instanceof Error
          ? err.message
          : String(err);
    console.error(`[email] Enquiry notification failed: ${reason}`);
  }
}
