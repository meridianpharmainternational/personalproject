/**
 * Push every sitemap URL to IndexNow (Bing, Yandex, Naver, Seznam…; Google does not take part).
 * The key is the name and content of the public/<key>.txt file, so search engines can verify it
 * at https://www.meridiannpharmainternational.com/<key>.txt.
 *
 * Run after a deploy that adds or changes products:  node scripts/indexnow.mjs [site origin]
 * Wait at least a few minutes before resubmitting a URL that changed again.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const origin = (process.argv[2] ?? "https://www.meridiannpharmainternational.com").replace(/\/$/, "");

const keyFile = readdirSync(join(ROOT, "public")).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error("✗ No public/<key>.txt file found");
  process.exit(1);
}
const key = readFileSync(join(ROOT, "public", keyFile), "utf8").trim();

const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urls.length) {
  console.error("✗ The sitemap listed no URLs");
  process.exit(1);
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: new URL(origin).host,
    key,
    keyLocation: `${origin}/${keyFile}`,
    urlList: urls.slice(0, 10000),
  }),
});
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urls.length} URLs`);
if (res.status >= 300) process.exit(1);
