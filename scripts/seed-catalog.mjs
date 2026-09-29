/**
 * Seed the FULL reference catalog (from E:/medi) into Supabase.
 *
 * Source data (already parsed from E:/medi/data/catalog.csv by that project's
 * importer): E:/medi/lib/catalog.json (molecules) + E:/medi/lib/brands.json
 * (brands per molecule), with images already downloaded to
 * E:/medi/public/products/brands/*.jpg.
 *
 * Mapping: one Meridian `medicine` row per BRAND (e.g. "Cenforce" under
 * Sildenafil Citrate), with the brand's representative image uploaded to the
 * medicine-images bucket.
 *
 * Source-data corrections (PRODUCT_FIXES, BRAND_FIXES, strength normalising,
 * exact-duplicate removal) are applied here so a re-seed stays correct; they
 * fix rows that would otherwise hide products from category, molecule, search,
 * Dosage-form and Strength-facet paths, and keep pack sizes out of strengths.
 *
 * Run:  node scripts/seed-catalog.mjs
 * Idempotent: re-inserts the whole catalog each run (clears prior seed rows).
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MEDI = "E:/medi";
const MEDI_PUBLIC = join(MEDI, "public");
const BUCKET = "medicine-images";

// --- env ------------------------------------------------------------------
function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i > -1) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  } catch {}
  return { ...env, ...process.env };
}
const env = loadEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY || URL.includes("your-project")) {
  console.error("✗ Missing Supabase creds in .env.local");
  process.exit(1);
}
const supabase = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// --- category display config (reference slug -> Meridian category) --------
const CATS = {
  "ed-medicines": { name: "ED Medicines", blurb: "Men's health — erectile-dysfunction formulations.", sort: 10, controlled: false },
  "anti-parasitic": { name: "Anti-Parasitic", blurb: "Anthelmintic (deworming) and antiparasitic agents.", sort: 20, controlled: false },
  "painkillers": { name: "Pain Relief", blurb: "Analgesics, muscle relaxants, and nerve-pain therapies.", sort: 30, controlled: true },
  "sleeping-pills": { name: "Sleeping Aids", blurb: "Insomnia and sleep-support medicines.", sort: 40, controlled: true },
  "sleep-alert": { name: "Wakefulness", blurb: "Wakefulness-promoting nootropics.", sort: 50, controlled: true },
  "hair-loss": { name: "Hair Care", blurb: "Hair-regrowth and anti-hair-loss range.", sort: 60, controlled: false },
  "steroid-injections": { name: "Injectables", blurb: "Injectable anabolic and hormone preparations.", sort: 70, controlled: true },
  "steroid-tablets": { name: "Oral Therapies", blurb: "Oral anabolic and hormone therapies.", sort: 80, controlled: true },
};
const OLD_PLACEHOLDER_SLUGS = [
  "general", "antibiotics", "pain-relief", "cardiovascular", "diabetes",
  "gastrointestinal", "respiratory", "vitamins",
];

// --- source-data corrections ------------------------------------------------
// Product-level overrides, keyed by E:/medi catalog.json product id. Applied
// before the category lookup, so category_id and the controlled note follow.
const PRODUCT_FIXES = {
  // Ivermectin creams were filed under Oral Therapies (oral anabolics) with a
  // split molecule "Ivermectin (Cream)", so ?molecule=Ivermectin and the
  // Anti-Parasitic category missed them. Form uses the one topical spelling
  // ("Cream / Gel", as tretinoin) so the Dosage form facet has one option.
  "steroid-tablets-ivermectin": { molecule: "Ivermectin", category: "anti-parasitic", form: "Cream / Gel" },
  // Pending owner decision: "steroid-tablets-tretinoin" (6 topical creams and
  // gels) is still filed under Oral Therapies. The 8 category names are fixed,
  // so the owner picks the target; then add { category: "<slug>" } here and
  // mirror it on the live rows in admin.
};
// Brand-level overrides, keyed by `${productId}::${brandName}`. `strengths`
// here replaces the cleaned list verbatim (no product-level fallback); `pack`
// replaces the product's pack. Mirror every entry on the live rows in admin
// so a re-seed and the live catalogue agree.
const BRAND_FIXES = {
  // Packs read "Sildenafil & Dapoxetine"; the source had plain Sildenafil
  // Citrate and fell back to the sildenafil-only strength list (25-250 mg).
  // Cenforce-D's pack does not print a strength: "On request" until the owner
  // confirms it. Extra Power's pack reads "Sildenafil 100mg & Dapoxetine 100mg".
  "ed-medicines-sildenafil::Cenforce-D": {
    molecule: "Sildenafil Citrate + Dapoxetine",
    strengths: "On request",
  },
  "ed-medicines-sildenafil::Cenforce D Extra Power": {
    molecule: "Sildenafil Citrate + Dapoxetine",
    strengths: "100 mg + 100 mg",
  },
  // Pack sizes were stored as strengths ("1 % w/w (30 g)", "… ampoules"),
  // adding Strength-facet options that are not strengths. Strength keeps the
  // concentration; the pack moves to `pack`. The ivermectin COVILIFE cream
  // ("30 g, 60 g, 100 g") is left as-is until the owner confirms its
  // concentration.
  "steroid-tablets-ivermectin::IVERHEAL": { strengths: "1 % w/w", pack: "30 g tube" },
  "steroid-tablets-ivermectin::IVERHUMAN": { strengths: "1 % w/w", pack: "30 g tube" },
  "steroid-tablets-ivermectin::IVER-ASH": { strengths: "1 % w/w", pack: "30 g tube" },
  "steroid-tablets-ivermectin::IMROTAB": { strengths: "1 % w/w", pack: "30 g tube" },
  "steroid-injections-levocarnitine::ZUBINET": { strengths: "1 g/5 ml", pack: "10-amp tray" },
  "steroid-injections-levocarnitine::L-CARNIREL": { strengths: "2000 mg/5 ml", pack: "10-amp tray" },
  "steroid-injections-levocarnitine::L-CARNIBOL": { strengths: "2000 mg/5 ml", pack: "10-amp tray" },
  // The product-level pack "10-amp tray · multi-dose vial" merged two formats; LEVONEXX is the vial.
  "steroid-injections-levocarnitine::LEVONEXX": { pack: "Multi-dose vial" },
};
// Targeted strength spellings that split Strength filter options.
const STRENGTH_ALIASES = {
  "250 MG": "250 mg",
  "400 mg/mL vial": "400 mg/ml",
  // Pack word dropped (the pack lives in `pack`; see BRAND_FIXES).
  "2000 mg/5 ml ampoule": "2000 mg/5 ml",
};

const mapAvailability = (a) => (a === "made-to-order" ? "made-to-order" : "in-stock");

function normStrength(s) {
  const t = String(s).trim();
  if (STRENGTH_ALIASES[t]) return STRENGTH_ALIASES[t];
  // Lower-case mass/volume units only (MG, MCG, G, mL after a number or "/").
  // IU is left untouched.
  return t.replace(/(?<=\d\s?|\/)(mcg|mg|ml|g)\b/gi, (u) => u.toLowerCase());
}

function cleanStrengths(brand, product) {
  const pick = (arr) => [
    ...new Set((arr || []).filter((s) => s && s !== "-" && String(s).trim()).map(normStrength)),
  ];
  let s = pick(brand.strengths);
  if (!s.length) s = pick(product.strengths);
  return s.join(", ") || "On request";
}

function repImage(brand) {
  if (brand.image && brand.image.trim()) return brand.image;
  if (brand.images) {
    const vals = Object.values(brand.images).filter(Boolean);
    if (vals.length) return vals[Math.floor(vals.length / 2)]; // a middle strength
  }
  return null;
}

async function main() {
  console.log(`→ Supabase: ${URL}`);
  const catalog = JSON.parse(readFileSync(join(MEDI, "lib", "catalog.json"), "utf8"));
  const brands = JSON.parse(readFileSync(join(MEDI, "lib", "brands.json"), "utf8"));

  // 0. tables exist?
  const probe = await supabase.from("medicines").select("id").limit(1);
  if (probe.error) {
    console.error(`✗ ${probe.error.message}\n  Run supabase/schema.sql first.`);
    process.exit(1);
  }

  // 1. bucket
  const { data: bks } = await supabase.storage.listBuckets();
  if (!bks?.some((b) => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
  console.log(`✓ Bucket ready`);

  // 2. categories
  const catRows = Object.entries(CATS).map(([slug, c]) => ({
    slug, name: c.name, blurb: c.blurb, sort_order: c.sort,
  }));
  const { data: cats, error: catErr } = await supabase
    .from("categories").upsert(catRows, { onConflict: "slug" }).select("id, slug");
  if (catErr) { console.error(`✗ categories: ${catErr.message}`); process.exit(1); }
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));
  console.log(`✓ Upserted ${cats.length} categories`);

  // 3. build medicine rows (one per brand) + collect image jobs
  const rows = [];
  const imgJobs = []; // { rowIndex, srcAbs, dest }
  let order = 0;
  let dupes = 0;
  const seen = new Set(); // exact-duplicate guard: product + brand + strengths + image
  for (const src of catalog) {
    const list = brands[src.id] || [];
    const product = { ...src, ...(PRODUCT_FIXES[src.id] || {}) };
    const cfg = CATS[product.category];
    for (const b of list) {
      const rep = repImage(b);
      const fix = BRAND_FIXES[`${src.id}::${b.name}`] || {};
      const strengths = fix.strengths ?? cleanStrengths(b, product);
      const key = [src.id, b.name.trim().toLowerCase(), strengths, rep || ""].join("|");
      if (seen.has(key)) { dupes++; continue; }
      seen.add(key);
      const row = {
        category_id: catId[product.category] ?? null,
        name: b.name,
        molecule: fix.molecule ?? product.molecule,
        form: product.form || null,
        strengths,
        pack: (fix.pack ?? product.pack) || null,
        moq: product.moq || "On request",
        lead_time: product.leadTime || null,
        availability: mapAvailability(product.availability),
        description: b.description || product.description || null,
        note: cfg?.controlled ? "Controlled in some markets — an import permit may be required." : null,
        image_path: null,
        is_active: true,
        sort_order: order++,
      };
      const idx = rows.push(row) - 1;
      if (rep) {
        const srcAbs = join(MEDI_PUBLIC, rep.replace(/^\//, ""));
        if (existsSync(srcAbs)) imgJobs.push({ rowIndex: idx, srcAbs, dest: `medi/${basename(rep)}` });
      }
    }
  }
  console.log(`✓ Prepared ${rows.length} medicines (${dupes} exact duplicates skipped); ${imgJobs.length} images to upload`);

  // 4. upload images (concurrency pool, dedup by source)
  const uploaded = new Map(); // srcAbs -> dest
  let done = 0, failed = 0, ji = 0;
  async function worker() {
    while (ji < imgJobs.length) {
      const job = imgJobs[ji++];
      try {
        let dest = uploaded.get(job.srcAbs);
        if (!dest) {
          const body = readFileSync(job.srcAbs);
          const up = await supabase.storage.from(BUCKET).upload(job.dest, body, {
            contentType: "image/jpeg", upsert: true,
          });
          if (up.error) throw new Error(up.error.message);
          dest = job.dest;
          uploaded.set(job.srcAbs, dest);
        }
        rows[job.rowIndex].image_path = dest;
        done++;
        if (done % 40 === 0) console.log(`  …uploaded ${done}/${imgJobs.length}`);
      } catch (e) {
        failed++;
        if (failed <= 5) console.warn(`  ✗ image: ${basename(job.srcAbs)} (${e.message})`);
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`✓ Uploaded ${done} images (${uploaded.size} unique)${failed ? `, ${failed} failed` : ""}`);

  // 5. clear prior seed/placeholder medicines, then insert the catalog
  await supabase.from("medicines").delete().or("image_path.is.null,image_path.like.seed/%,image_path.like.medi/%");

  let inserted = 0;
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const ins = await supabase.from("medicines").insert(chunk);
    if (ins.error) { console.error(`✗ insert chunk ${i}: ${ins.error.message}`); continue; }
    inserted += chunk.length;
    console.log(`  inserted ${inserted}/${rows.length}`);
  }

  // 6. remove now-empty placeholder categories
  await supabase.from("categories").delete().in("slug", OLD_PLACEHOLDER_SLUGS);

  // summary
  const byCat = {};
  for (const r of rows) byCat[r.category_id] = (byCat[r.category_id] || 0) + 1;
  console.log(`\n✅ Seeded ${inserted} medicines across ${cats.length} categories.`);
  const sample = rows.find((r) => r.image_path);
  if (sample) console.log(`   Sample image: ${URL}/storage/v1/object/public/${BUCKET}/${sample.image_path}`);
  console.log(`   → http://localhost:3000/medicines\n`);
}

main().catch((e) => { console.error("✗ Seed failed:", e); process.exit(1); });
