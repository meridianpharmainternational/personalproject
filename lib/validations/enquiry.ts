import { z } from "zod";

/** "Please keep <what> to <n> characters or fewer." for a string max check. */
const tooLong = (what: string, n: number) => `Please keep ${what} to ${n.toLocaleString("en")} characters or fewer.`;

/**
 * Enquiry form (contact page + the enquiry-list drawer).
 *
 * All fields are plain strings (optional ones simply allow ""), which keeps the
 * react-hook-form value type and the resolver output identical — no optional/
 * default mismatch. The refine ensures we capture something actionable: either
 * a written message (contact form) or at least one product (enquiry list).
 *
 * Every check carries its own message: submitEnquiry returns the first issue's
 * message to the buyer as-is, so a Zod default must never reach the page.
 */
export const enquirySchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your name.").max(120, tooLong("your name", 120)),
    email: z
      .string()
      .trim()
      .min(1, "Please enter your email address.")
      .max(254, tooLong("your email address", 254))
      .email("Please enter a valid email address, like name@company.com."),
    phone: z.string().trim().max(40, tooLong("the phone number", 40)),
    country: z.string().trim().max(80, tooLong("the country name", 80)),
    company: z.string().trim().max(120, tooLong("the company name", 120)),
    // The enquiry list is sent as one numbered list: up to 100 lines of about
    // 590 characters each at the per-line limits below, so allow room.
    product: z.string().trim().max(60000, "Your list is too long to send in one enquiry. Please split it."),
    message: z.string().trim().max(3000, tooLong("your message", 3000)),
  })
  .refine((d) => d.message.length >= 5 || d.product.length > 0, {
    message: "Please write a short message (at least 5 characters).",
    path: ["message"],
  });

export type EnquiryInput = z.infer<typeof enquirySchema>;

/** One line of the enquiry list, as submitted by the client. */
export const enquiryItemSchema = z.object({
  name: z.string().trim().min(1, "Each product needs a name.").max(200, tooLong("each product name", 200)),
  molecule: z.string().trim().max(200, tooLong("the molecule", 200)).nullable().optional(),
  form: z.string().trim().max(80, tooLong("the dosage form", 80)).nullable().optional(),
  strength: z.string().trim().max(80, tooLong("the strength", 80)).nullable().optional(),
  qty: z.coerce
    .number({ invalid_type_error: "Please enter the number of packs." })
    .int("Please enter a whole number of packs.")
    .min(1, "Please enter at least 1 pack.")
    .max(100000, "Please keep each quantity to 100,000 packs or fewer."),
});

export const enquiryItemsSchema = z
  .array(enquiryItemSchema)
  .max(100, "An enquiry can hold up to 100 products. Please split your list.");
