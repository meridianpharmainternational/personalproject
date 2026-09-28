import { z } from "zod";

/** Admin add/edit medicine form. Re-validated server-side in the actions. */
export const medicineSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  molecule: z.string().trim().max(200).optional().default(""),
  category_id: z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .default(""),
  form: z.string().trim().max(80).optional().default(""),
  strengths: z.string().trim().max(300).optional().default(""),
  pack: z.string().trim().max(200).optional().default(""),
  moq: z.string().trim().max(100).optional().default(""),
  lead_time: z.string().trim().max(100).optional().default(""),
  availability: z
    .enum(["in-stock", "made-to-order"])
    .default("in-stock"),
  description: z.string().trim().max(5000).optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().min(0).max(100000).default(0),
});

export type MedicineInput = z.infer<typeof medicineSchema>;
