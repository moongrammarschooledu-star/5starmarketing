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
