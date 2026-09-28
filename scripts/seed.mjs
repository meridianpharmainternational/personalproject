/**
 * Seed script — populates Supabase with a realistic medicine catalog + branded
 * product images, so the UI shows real data.
 *
 * Run:  node scripts/seed.mjs
 *
 * Requires (read from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (service role — bypasses RLS, server-only)
 *
 * It is idempotent: categories are upserted by slug, and previously-seeded
 * medicines (image_path starting with "seed/") are removed before re-inserting.
 * Admin-added medicines (random image paths) are left untouched.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BUCKET = "medicine-images";

// ---------------------------------------------------------------------------
// Load env from .env.local
// ---------------------------------------------------------------------------
function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  } catch {
    /* no .env.local */
  }
  return { ...env, ...process.env };
}

const env = loadEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY || URL.includes("your-project") || KEY.includes("your-")) {
  console.error(
    "\n✗ Missing Supabase credentials. Fill NEXT_PUBLIC_SUPABASE_URL and " +
      "SUPABASE_SERVICE_ROLE_KEY in .env.local first.\n",
  );
  process.exit(1);
}

const supabase = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { slug: "pain-relief", name: "Pain Relief", blurb: "Analgesics and anti-inflammatory medicines.", sort_order: 10 },
  { slug: "antibiotics", name: "Antibiotics", blurb: "Antibacterial and anti-infective agents.", sort_order: 20 },
  { slug: "cardiovascular", name: "Cardiovascular", blurb: "Heart and blood-pressure therapies.", sort_order: 30 },
  { slug: "diabetes", name: "Diabetes Care", blurb: "Antidiabetic medicines.", sort_order: 40 },
  { slug: "gastrointestinal", name: "Gastrointestinal", blurb: "Acidity, ulcer, and digestive care.", sort_order: 50 },
  { slug: "respiratory", name: "Respiratory & Allergy", blurb: "Asthma, cough, and allergy relief.", sort_order: 60 },
  { slug: "vitamins", name: "Vitamins & Supplements", blurb: "Nutritional and supportive therapy.", sort_order: 70 },
];

const MEDICINES = [
  { slug: "paracetamol-500", name: "Paracetamol", molecule: "Acetaminophen", cat: "pain-relief", form: "Tablet", strengths: "500 mg, 650 mg", pack: "10 x 10 blister", moq: "500 boxes", lead_time: "2–3 weeks", availability: "in-stock", desc: "Widely used analgesic and antipyretic for mild-to-moderate pain and fever.", note: "WHO-GMP · CoA with every batch" },
  { slug: "ibuprofen-400", name: "Ibuprofen", molecule: "Ibuprofen", cat: "pain-relief", form: "Tablet", strengths: "200 mg, 400 mg", pack: "10 x 10 blister", moq: "500 boxes", lead_time: "2–3 weeks", availability: "in-stock", desc: "NSAID for pain, inflammation, and fever." },
  { slug: "diclofenac-50", name: "Diclofenac Sodium", molecule: "Diclofenac Sodium", cat: "pain-relief", form: "Tablet", strengths: "50 mg", pack: "10 x 10 blister", moq: "300 boxes", lead_time: "3–4 weeks", availability: "in-stock", desc: "Potent NSAID for musculoskeletal and joint pain." },
  { slug: "amoxicillin-500", name: "Amoxicillin", molecule: "Amoxicillin Trihydrate", cat: "antibiotics", form: "Capsule", strengths: "250 mg, 500 mg", pack: "10 x 10 blister", moq: "500 boxes", lead_time: "3–4 weeks", availability: "in-stock", desc: "Broad-spectrum penicillin antibiotic for common bacterial infections.", note: "Import permit may be required" },
  { slug: "azithromycin-500", name: "Azithromycin", molecule: "Azithromycin Dihydrate", cat: "antibiotics", form: "Tablet", strengths: "250 mg, 500 mg", pack: "3 x 10 blister", moq: "300 boxes", lead_time: "3–4 weeks", availability: "in-stock", desc: "Macrolide antibiotic with a convenient short-course dosing." },
  { slug: "ciprofloxacin-500", name: "Ciprofloxacin", molecule: "Ciprofloxacin HCl", cat: "antibiotics", form: "Tablet", strengths: "250 mg, 500 mg", pack: "10 x 10 blister", moq: "300 boxes", lead_time: "3–4 weeks", availability: "made-to-order", desc: "Fluoroquinolone antibiotic for a range of bacterial infections." },
  { slug: "amlodipine-5", name: "Amlodipine", molecule: "Amlodipine Besylate", cat: "cardiovascular", form: "Tablet", strengths: "2.5 mg, 5 mg, 10 mg", pack: "10 x 10 blister", moq: "500 boxes", lead_time: "2–3 weeks", availability: "in-stock", desc: "Calcium-channel blocker for hypertension and angina." },
  { slug: "atorvastatin-20", name: "Atorvastatin", molecule: "Atorvastatin Calcium", cat: "cardiovascular", form: "Tablet", strengths: "10 mg, 20 mg, 40 mg", pack: "10 x 10 blister", moq: "500 boxes", lead_time: "2–3 weeks", availability: "in-stock", desc: "Statin for lowering LDL cholesterol and cardiovascular risk." },
  { slug: "losartan-50", name: "Losartan Potassium", molecule: "Losartan Potassium", cat: "cardiovascular", form: "Tablet", strengths: "25 mg, 50 mg", pack: "10 x 10 blister", moq: "300 boxes", lead_time: "3–4 weeks", availability: "in-stock", desc: "Angiotensin-receptor blocker for blood-pressure control." },
  { slug: "metformin-500", name: "Metformin", molecule: "Metformin HCl", cat: "diabetes", form: "Tablet", strengths: "500 mg, 850 mg, 1000 mg", pack: "10 x 10 blister", moq: "500 boxes", lead_time: "2–3 weeks", availability: "in-stock", desc: "First-line oral therapy for type-2 diabetes." },
  { slug: "glimepiride-2", name: "Glimepiride", molecule: "Glimepiride", cat: "diabetes", form: "Tablet", strengths: "1 mg, 2 mg", pack: "10 x 10 blister", moq: "300 boxes", lead_time: "3–4 weeks", availability: "made-to-order", desc: "Sulfonylurea used to improve glycaemic control." },
  { slug: "omeprazole-20", name: "Omeprazole", molecule: "Omeprazole", cat: "gastrointestinal", form: "Capsule", strengths: "20 mg, 40 mg", pack: "10 x 10 blister", moq: "500 boxes", lead_time: "2–3 weeks", availability: "in-stock", desc: "Proton-pump inhibitor for acidity, reflux, and ulcers." },
  { slug: "pantoprazole-40", name: "Pantoprazole", molecule: "Pantoprazole Sodium", cat: "gastrointestinal", form: "Tablet", strengths: "20 mg, 40 mg", pack: "10 x 10 blister", moq: "500 boxes", lead_time: "2–3 weeks", availability: "in-stock", desc: "Enteric-coated PPI for gastro-oesophageal reflux disease." },
  { slug: "salbutamol-inhaler", name: "Salbutamol Inhaler", molecule: "Salbutamol Sulfate", cat: "respiratory", form: "Inhaler", strengths: "100 mcg/dose", pack: "200 metered doses", moq: "200 units", lead_time: "4–5 weeks", availability: "made-to-order", desc: "Fast-acting bronchodilator for asthma and COPD relief.", note: "Cold-chain not required · store below 30°C" },
  { slug: "cetirizine-10", name: "Cetirizine", molecule: "Cetirizine HCl", cat: "respiratory", form: "Tablet", strengths: "5 mg, 10 mg", pack: "10 x 10 blister", moq: "300 boxes", lead_time: "2–3 weeks", availability: "in-stock", desc: "Non-drowsy antihistamine for allergic rhinitis and urticaria." },
  { slug: "vitamin-d3-60k", name: "Vitamin D3", molecule: "Cholecalciferol", cat: "vitamins", form: "Softgel", strengths: "60,000 IU", pack: "4 x 1 strip", moq: "500 boxes", lead_time: "2–3 weeks", availability: "in-stock", desc: "High-strength weekly vitamin D3 supplement." },
  { slug: "ors-sachet", name: "ORS Sachet", molecule: "Oral Rehydration Salts", cat: "vitamins", form: "Sachet", strengths: "20.5 g", pack: "50 sachets", moq: "500 boxes", lead_time: "2–3 weeks", availability: "in-stock", desc: "WHO-formula oral rehydration salts for dehydration." },
];

// ---------------------------------------------------------------------------
// Branded SVG product image per medicine
// ---------------------------------------------------------------------------
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function glyph(form) {
  const f = (form || "").toLowerCase();
  if (f.includes("capsule") || f.includes("softgel"))
    return `<g transform="rotate(-35 400 320)"><rect x="300" y="288" width="200" height="64" rx="32" fill="#234da3"/><rect x="400" y="288" width="100" height="64" rx="32" fill="#37a12d"/><rect x="300" y="288" width="200" height="64" rx="32" fill="none" stroke="#0f2350" stroke-opacity="0.15" stroke-width="2"/></g>`;
  if (f.includes("inhaler"))
    return `<g><rect x="360" y="250" width="80" height="120" rx="14" fill="#234da3"/><rect x="372" y="360" width="90" height="46" rx="10" fill="#159a8e"/><rect x="372" y="232" width="56" height="34" rx="8" fill="#0f2350"/></g>`;
  if (f.includes("sachet"))
    return `<g><path d="M330 250 l140 0 l0 150 l-140 0 z" fill="#37a12d"/><path d="M330 250 l14 -14 l14 14 l14 -14 l14 14 l14 -14 l14 14 l14 -14 l14 14 l14 -14 l14 14" fill="none" stroke="#0f2350" stroke-opacity="0.25" stroke-width="3"/><rect x="352" y="300" width="96" height="10" rx="5" fill="#ffffff" opacity="0.7"/></g>`;
  if (f.includes("syrup") || f.includes("drop") || f.includes("bottle"))
    return `<g><rect x="366" y="238" width="68" height="26" rx="6" fill="#0f2350"/><path d="M360 268 q40 -8 80 0 l0 118 a16 16 0 0 1 -16 16 l-48 0 a16 16 0 0 1 -16 -16 z" fill="#159a8e"/><rect x="372" y="330" width="56" height="50" rx="8" fill="#ffffff" opacity="0.85"/></g>`;
  // default: tablet
  return `<g><circle cx="400" cy="320" r="70" fill="#ffffff" stroke="#234da3" stroke-width="8"/><line x1="400" y1="256" x2="400" y2="384" stroke="#234da3" stroke-width="6"/></g>`;
}

function svgFor(m) {
  const strength = (m.strengths || "").split(",")[0].trim();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef4fc"/>
    </linearGradient>
    <radialGradient id="b1" cx="15%" cy="10%" r="60%">
      <stop offset="0" stop-color="#234da3" stop-opacity="0.14"/><stop offset="1" stop-color="#234da3" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="b2" cx="100%" cy="0%" r="55%">
      <stop offset="0" stop-color="#37a12d" stop-opacity="0.12"/><stop offset="1" stop-color="#37a12d" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <rect width="800" height="600" fill="url(#b1)"/>
  <rect width="800" height="600" fill="url(#b2)"/>
  ${glyph(m.form)}
  <text x="60" y="470" font-family="-apple-system, Segoe UI, Roboto, Arial, sans-serif" font-size="52" font-weight="800" fill="#0f2350">${esc(m.name)}</text>
  <text x="60" y="510" font-family="-apple-system, Segoe UI, Roboto, Arial, sans-serif" font-size="26" font-weight="500" fill="#5b6b86">${esc(m.molecule)}</text>
  <g transform="translate(60 528)">
    <rect x="0" y="0" width="${90 + strength.length * 13}" height="38" rx="19" fill="#eaf6e8" stroke="#b0e0a9"/>
    <text x="18" y="25" font-family="-apple-system, Segoe UI, Roboto, Arial, sans-serif" font-size="20" font-weight="700" fill="#236a1e">${esc(strength)}</text>
  </g>
  <text x="740" y="558" text-anchor="end" font-family="-apple-system, Segoe UI, Roboto, Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="1.5" fill="#234da3">MERIDIAN PHARMA</text>
</svg>`;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
async function main() {
  console.log(`→ Supabase: ${URL}`);

  // 0. Sanity: do the tables exist?
  const probe = await supabase.from("categories").select("id").limit(1);
  if (probe.error) {
    console.error(
      `\n✗ Could not read the "categories" table: ${probe.error.message}\n` +
        `  Run the schema first: Supabase Dashboard → SQL Editor → paste & run\n` +
        `  supabase/schema.sql, then re-run this script.\n`,
    );
    process.exit(1);
  }

  // 1. Ensure the public image bucket exists.
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error && !/already exists/i.test(error.message)) {
      console.error(`✗ Could not create bucket: ${error.message}`);
      process.exit(1);
    }
    console.log(`✓ Created public bucket "${BUCKET}"`);
  } else {
    console.log(`✓ Bucket "${BUCKET}" ready`);
  }

  // 2. Upsert categories, map slug -> id.
  const { data: cats, error: catErr } = await supabase
    .from("categories")
    .upsert(CATEGORIES, { onConflict: "slug" })
    .select("id, slug");
  if (catErr) {
    console.error(`✗ Category upsert failed: ${catErr.message}`);
    process.exit(1);
  }
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));
  console.log(`✓ Upserted ${cats.length} categories`);

  // 3. Remove previously-seeded medicines (leave admin-added ones alone).
  const del = await supabase.from("medicines").delete().like("image_path", "seed/%");
  if (del.error) console.warn(`  (cleanup warning: ${del.error.message})`);

  // 4. For each medicine: upload branded image, insert row.
  let ok = 0;
  for (let i = 0; i < MEDICINES.length; i++) {
    const m = MEDICINES[i];
    const path = `seed/${m.slug}.svg`;
    const body = Buffer.from(svgFor(m), "utf8");

    const up = await supabase.storage
      .from(BUCKET)
      .upload(path, body, { contentType: "image/svg+xml", upsert: true });
    if (up.error) {
      console.error(`  ✗ image upload failed for ${m.name}: ${up.error.message}`);
      continue;
    }

    const ins = await supabase.from("medicines").insert({
      category_id: catId[m.cat] ?? null,
      name: m.name,
      molecule: m.molecule,
      form: m.form,
      strengths: m.strengths,
      pack: m.pack,
      moq: m.moq,
      lead_time: m.lead_time,
      availability: m.availability,
      description: m.desc,
      note: m.note ?? null,
      image_path: path,
      is_active: true,
      sort_order: i,
    });
    if (ins.error) {
      console.error(`  ✗ insert failed for ${m.name}: ${ins.error.message}`);
      continue;
    }
    ok++;
    console.log(`  ✓ ${m.name} (${m.form})`);
  }

  const sampleUrl = `${URL}/storage/v1/object/public/${BUCKET}/seed/${MEDICINES[0].slug}.svg`;
  console.log(`\n✅ Seeded ${ok}/${MEDICINES.length} medicines across ${cats.length} categories.`);
  console.log(`   Sample image: ${sampleUrl}`);
  console.log(`   Start the app:  npm run dev  →  http://localhost:3000/medicines\n`);
}

main().catch((e) => {
  console.error("✗ Seed failed:", e);
  process.exit(1);
});
