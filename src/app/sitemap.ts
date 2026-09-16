import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { blogService } from "@/services/blogService";
import { isSupabaseConfigured } from "@/lib/supabase/server";

function slugifyCity(city: string) {
  return city.toLowerCase().trim().replace(/\s+/g, "-");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: site.url, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${site.url}/properties`, changeFrequency: "daily", priority: 0.9 },
    // Curated search landing pages (STEP 16) — listed at their real
    // canonical URL (the destination /properties?... their /properties/*
    // short links redirect to), not the redirecting short URL itself.
    { url: `${site.url}/properties?purpose=sale`, changeFrequency: "daily", priority: 0.8 },
    { url: `${site.url}/properties?purpose=rent`, changeFrequency: "daily", priority: 0.8 },
    { url: `${site.url}/properties?type=house`, changeFrequency: "daily", priority: 0.7 },
    { url: `${site.url}/properties?type=flat`, changeFrequency: "daily", priority: 0.7 },
    { url: `${site.url}/properties?type=commercial`, changeFrequency: "daily", priority: 0.7 },
    { url: `${site.url}/projects`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${site.url}/services`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${site.url}/investment`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${site.url}/construction`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${site.url}/contact`, changeFrequency: "monthly", priority: 0.6 },
    // STEP 32
    { url: `${site.url}/buy`, changeFrequency: "daily", priority: 0.7 },
    { url: `${site.url}/rent`, changeFrequency: "daily", priority: 0.7 },
    { url: `${site.url}/commercial`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${site.url}/residential`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${site.url}/locations`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${site.url}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${site.url}/faq`, changeFrequency: "monthly", priority: 0.5 },
    // Note: campaign landing pages (/landing/*) are deliberately excluded
    // — they're set noindex on their own page (existing to convert paid
    // traffic, not to rank organically), so listing them here would send
    // search engines a contradictory signal.
  ];

  if (!isSupabaseConfigured()) return staticPages;

  try {
    const [properties, projects, blogPosts, cities] = await Promise.all([
      propertyService.list(),
      projectService.listPublished(),
      blogService.listPublished(undefined, 1000),
      propertyService.listDistinctCities(),
    ]);

    const blogPages: MetadataRoute.Sitemap = blogPosts.map((p) => ({
      url: `${site.url}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly",
      priority: 0.5,
    }));

    const locationPages: MetadataRoute.Sitemap = cities.map((city) => ({
      url: `${site.url}/locations/${slugifyCity(city)}`,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    // Only public/active/published records — never draft projects or
    // inactive listings, matching what the site actually shows.
    const propertyPages: MetadataRoute.Sitemap = properties
      .filter((p) => p.status !== "Inactive")
      .map((p) => ({
        url: `${site.url}/properties/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      }));

    const projectPages: MetadataRoute.Sitemap = projects.map((p) => ({
      url: `${site.url}/projects/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticPages, ...propertyPages, ...projectPages, ...blogPages, ...locationPages];
  } catch (e) {
    console.error("sitemap: failed to load dynamic pages:", e);
    return staticPages;
  }
}
