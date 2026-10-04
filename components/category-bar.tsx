/** Catalogue navigation data built once in the root layout (counts per category). */
export type NavCategory = { slug: string; name: string; count: number };
export type NavData = { total: number; categories: NavCategory[] };
