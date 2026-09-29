"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { enquirySchema, enquiryItemsSchema } from "@/lib/validations/enquiry";
import { formatEnquiryItems } from "@/lib/format";
import { sendEnquiryNotification } from "@/lib/email";
import type { EnquiryInsert } from "@/types/db";

export type EnquiryResult = { ok: boolean; error?: string };

/**
 * The only `source` labels the admin inbox knows. Anything else a client sends
 * is replaced with the default, so a forged value cannot mislabel a record.
 * ("Product Enquiry" is kept for records created by earlier versions of the site.)
 */
const SOURCES = ["Contact Form", "Enquiry List", "Product Enquiry"] as const;
const DEFAULT_SOURCE = "Contact Form";

/** Longest `page` pathname kept on a record; anything longer is cut. */
const PAGE_MAX = 300;

/**
 * Honeypot field name. Both enquiry forms render a visually hidden, unlabelled
 * text input with this name (tabIndex -1, autoComplete off, password-manager
 * opt-outs, inside an aria-hidden wrapper) and copy its value into the
 * FormData. People never fill it; form-filling bots do. The name is
 * deliberately meaningless: a name like "website" is one that identity
 * autofill tools target, which would flag a real buyer. Not exported: a
 * "use server" file may only export async functions.
 */
const HONEYPOT_FIELD = "mp_extra_7";

/**
 * Put at the start of `message` on a record whose honeypot was filled. The
 * record is still stored (autofill can fill the field for a real buyer, and a
 * lost enquiry is worse than a spam row), but no email is sent for it.
 */
const HONEYPOT_FLAG = "[Flagged: hidden field filled]";

/** An identical enquiry (same email, product and message) inside this window is treated as a resend. */
const DUPLICATE_WINDOW_MS = 60_000;

/** Read a FormData field as text. Files and missing fields read as "". */
function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

/** Keep `source` only when it is one of the known labels. */
function cleanSource(raw: string): string {
  const s = raw.trim();
  return (SOURCES as readonly string[]).includes(s) ? s : DEFAULT_SOURCE;
}

/**
 * Keep `page` only when it looks like a site pathname: it starts with a single
 * "/" (not "//" or "/\", which browsers treat as another host) and holds no
 * whitespace or control characters. Cut to PAGE_MAX characters.
 */
function cleanPage(raw: string): string | null {
  const p = raw.trim();
  if (!p.startsWith("/") || p.startsWith("//") || p.startsWith("/\\")) return null;
  if (/[\s\u0000-\u001f\u007f]/.test(p)) return null;
  return p.slice(0, PAGE_MAX);
}

/**
 * Public enquiry submission (contact form + the multi-product enquiry list).
 *
 * If the form carries an `items` JSON field (the enquiry list), it is validated
 * and formatted HERE on the server into a numbered product list — the client's
 * own formatting is never trusted. `source` is limited to the known labels and
 * `page` to a short site pathname. Inserts via the SERVER-ONLY service-role
 * client, so the `enquiries` table is never publicly writable. Then fires an
 * optional email notification (no-op if not configured).
 *
 * Abuse guards: an identical enquiry from the same email in the last minute
 * returns `{ ok: true }` without inserting or emailing, so a resent form is not
 * stored twice. A filled honeypot field does NOT discard the enquiry: it goes
 * through the same checks and is stored with HONEYPOT_FLAG at the start of its
 * message, but no email is sent. The reply is the same either way, so bots get
 * no signal, and a real buyer whose autofill filled the field loses nothing.
 */
export async function submitEnquiry(
  formData: FormData,
): Promise<EnquiryResult> {
  // Honeypot: remember it, but keep going so the record is kept (flagged).
  const flagged = text(formData, HONEYPOT_FIELD).trim() !== "";

  let product = text(formData, "product");

  const rawItems = formData.get("items");
  if (typeof rawItems === "string" && rawItems.trim()) {
    let json: unknown;
    try {
      json = JSON.parse(rawItems);
    } catch {
      return { ok: false, error: "Your enquiry list could not be read. Please try again." };
    }
    const items = enquiryItemsSchema.safeParse(json);
    if (!items.success) {
      return { ok: false, error: "Your enquiry list looks invalid. Please review it and try again." };
    }
    if (items.data.length) product = formatEnquiryItems(items.data);
  }

  const parsed = enquirySchema.safeParse({
    name: text(formData, "name"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    country: text(formData, "country"),
    company: text(formData, "company"),
    product,
    message: text(formData, "message"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const d = parsed.data;
  const message = flagged
    ? [HONEYPOT_FLAG, d.message].filter(Boolean).join("\n\n")
    : d.message || null;
  const record: EnquiryInsert = {
    source: cleanSource(text(formData, "source")),
    name: d.name,
    email: d.email,
    phone: d.phone || null,
    country: d.country || null,
    company: d.company || null,
    product: d.product || null,
    message,
    page: cleanPage(text(formData, "page")),
  };

  try {
    const admin = createAdminClient();

    // Duplicate guard. Only the email and time go in the query (product lists
    // can be long); product and message are compared here. If the lookup
    // fails, carry on and insert: a lost enquiry is worse than a duplicate.
    const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
    const { data: recent, error: recentError } = await admin
      .from("enquiries")
      .select("product, message")
      .eq("email", record.email)
      .gte("created_at", since)
      .limit(20);
    if (
      !recentError &&
      Array.isArray(recent) &&
      recent.some(
        (r: { product: string | null; message: string | null }) =>
          (r.product ?? null) === (record.product ?? null) &&
          (r.message ?? null) === (record.message ?? null),
      )
    ) {
      return { ok: true };
    }

    const { error } = await admin.from("enquiries").insert(record);
    if (error) {
      return { ok: false, error: "Could not send your enquiry. Please try again." };
    }
  } catch {
    return { ok: false, error: "Could not send your enquiry. Please try again." };
  }

  // A flagged record waits in the admin inbox; it does not trigger an email.
  if (!flagged) await sendEnquiryNotification(record);
  return { ok: true };
}
