import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** Public catalogue open to crawlers; admin, sign-in and API routes kept out of the index. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/login", "/api", "/auth"] },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
