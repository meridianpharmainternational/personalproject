/**
 * TypeScript types mirroring the Supabase schema in supabase/schema.sql
 * (the schema owner applies the SQL separately; the app never migrates it).
 *
 * Model: categories 1─▶∞ medicines.  Public visitors read active medicines and
 * submit enquiries; admins (rows in `admins`) manage medicines and read the
 * enquiries inbox.
 *
 * Regenerate exact types once the schema is live:
 *   npx supabase gen types typescript --project-id <ref> --schema public > types/supabase.ts
 */

export type Availability = "in-stock" | "made-to-order";

export interface Category {
  id: string;
  slug: string;
  name: string;
  blurb: string | null;
  sort_order: number;
  created_at: string;
}

export interface Medicine {
  id: string;
  category_id: string | null;
  name: string; // product / brand name, e.g. "Cenforce"
  molecule: string | null; // salt / active ingredient, e.g. "Sildenafil Citrate"
  form: string | null; // Tablet, Capsule, Injection, ...
  strengths: string | null; // comma-separated, e.g. "50 mg, 100 mg"
  pack: string | null; // e.g. "10 x 10 blister"
  moq: string | null; // minimum order quantity
  lead_time: string | null;
  availability: Availability;
  description: string | null;
  note: string | null;
  image_path: string | null; // path within the public `medicine-images` bucket
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
}

/** A medicine joined with its category, for listing/detail rendering. */
export interface MedicineWithCategory extends Medicine {
  category: Pick<Category, "id" | "slug" | "name"> | null;
}

export type EnquiryStatus = "new" | "read" | "archived";

export interface Enquiry {
  id: string;
  source: string; // "Contact Form" | "Product Enquiry"
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  company: string | null;
  product: string | null; // which medicine the visitor asked about
  message: string | null;
  page: string | null; // pathname the enquiry was sent from
  status: EnquiryStatus;
  created_at: string;
}

/** Presence of an admins row (id === auth.users.id) grants admin access. */
export interface Admin {
  id: string;
  email: string | null;
  created_at: string;
}

// --- Write payloads --------------------------------------------------------

export type MedicineInsert = {
  category_id?: string | null;
  name: string;
  molecule?: string | null;
  form?: string | null;
  strengths?: string | null;
  pack?: string | null;
  moq?: string | null;
  lead_time?: string | null;
  availability?: Availability;
  description?: string | null;
  note?: string | null;
  image_path?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

export type EnquiryInsert = {
  source: string;
  name: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  company?: string | null;
  product?: string | null;
  message?: string | null;
  page?: string | null;
};
