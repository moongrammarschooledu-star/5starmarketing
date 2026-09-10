import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { isSupabaseConfigured } from "@/lib/supabase/server";

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
  ];

  if (!isSupabaseConfigured()) return staticPages;

  try {
    const [properties, projects] = await Promise.all([
      propertyService.list(),
      projectService.listPublished(),
    ]);

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

    return [...staticPages, ...propertyPages, ...projectPages];
  } catch (e) {
    console.error("sitemap: failed to load dynamic pages:", e);
    return staticPages;
  }
}
