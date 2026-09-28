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

const mapAvailability = (a) => (a === "made-to-order" ? "made-to-order" : "in-stock");

function cleanStrengths(brand, product) {
  const pick = (arr) => (arr || []).filter((s) => s && s !== "-" && String(s).trim());
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
  for (const product of catalog) {
    const list = brands[product.id] || [];
    const cfg = CATS[product.category];
    for (const b of list) {
      const rep = repImage(b);
      const row = {
        category_id: catId[product.category] ?? null,
        name: b.name,
        molecule: product.molecule,
        form: product.form || null,
        strengths: cleanStrengths(b, product),
        pack: product.pack || null,
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
  console.log(`✓ Prepared ${rows.length} medicines; ${imgJobs.length} images to upload`);

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
