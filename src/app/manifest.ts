import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Next.js serves this at /manifest.webmanifest and auto-links it from
// every page's <head> — no separate public/manifest.json needed.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.fullName,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    id: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#e01e26",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Search Properties",
        short_name: "Search",
        url: "/properties",
        icons: [{ src: "/icons/shortcut-search.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "My Favorites",
        short_name: "Favorites",
        url: "/customer/favorites",
        icons: [{ src: "/icons/shortcut-favorites.png", sizes: "96x96", type: "image/png" }],
      },
    ],
    categories: ["business", "real estate", "lifestyle"],
  };
}
