import { z } from "zod";

/**
 * Enquiry form (contact page + per-product "Enquire" modal).
 *
 * All fields are plain strings (optional ones simply allow ""), which keeps the
 * react-hook-form value type and the resolver output identical — no optional/
 * default mismatch. The refine ensures we capture something actionable: either
 * a written message or a named product.
 */
export const enquirySchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your name.").max(120),
    email: z.string().trim().email("Enter a valid email address."),
    phone: z.string().trim().max(40),
    country: z.string().trim().max(80),
    company: z.string().trim().max(120),
    product: z.string().trim().max(200),
    message: z.string().trim().max(3000),
  })
  .refine((d) => d.message.length >= 5 || d.product.length > 0, {
    message: "Please add a short message.",
    path: ["message"],
  });

export type EnquiryInput = z.infer<typeof enquirySchema>;
