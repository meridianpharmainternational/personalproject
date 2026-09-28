/**
 * Build the public URL for an image stored in the public `medicine-images`
 * bucket. Works on both server and client (uses the NEXT_PUBLIC_ base URL).
 */
export function medicineImageUrl(
  imagePath: string | null | undefined,
): string | null {
  if (!imagePath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/medicine-images/${imagePath}`;
}
