import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Web app manifest, served at /manifest.webmanifest and linked from every page by Next. The
 * icons live in public/icons; theme_color matches the viewport export in app/layout.tsx.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: site.fullName,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "minimal-ui",
    background_color: "#ffffff",
    theme_color: "#0f2350",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
