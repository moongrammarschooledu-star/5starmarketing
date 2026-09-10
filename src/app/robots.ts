import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/customer", "/login", "/register", "/forgot-password", "/reset-password", "/compare", "/book-visit", "/payment-plan-print"],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
