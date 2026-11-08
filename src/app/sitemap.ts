import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { blogService } from "@/services/blogService";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { lahoreAreas } from "@/lib/lahoreAreas";

function slugifyCity(city: string) {
  return city.toLowerCase().trim().replace(/\s+/g, "-");
}

async function withFallback<T>(
  label: string,
  load: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.error(`sitemap: failed to load ${label}:`, error);
    return fallback;
  }
}

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
    { url: `${site.url}/buy`, changeFrequency: "daily", priority: 0.7 },
    { url: `${site.url}/rent`, changeFrequency: "daily", priority: 0.7 },
    { url: `${site.url}/commercial`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${site.url}/residential`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${site.url}/locations`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${site.url}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${site.url}/faq`, changeFrequency: "monthly", priority: 0.5 },
  ];

  if (!isSupabaseConfigured()) return staticPages;

  // Load each content source independently. A temporary failure in one
  // table/query should not remove every other dynamic URL from the sitemap.
  const [properties, projects, blogPosts, cities] = await Promise.all([
    withFallback("properties", () => propertyService.list(), []),
    withFallback("published projects", () => projectService.listPublished(), []),
    withFallback("published blog posts", () => blogService.listPublished(undefined, 1000), []),
    withFallback("cities", () => propertyService.listDistinctCities(), []),
  ]);

  const areaResults = await Promise.all(
    lahoreAreas.map(async (area) => {
      const result = await withFallback(
        `Lahore area ${area.name}`,
        () => propertyService.search({ city: "Lahore", area: area.name, pageSize: 1 }),
        null,
      );
      return result ? { area, result } : null;
    }),
  );

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

  // Only include curated locality pages when real active listings match.
  const areaPages: MetadataRoute.Sitemap = areaResults
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null && entry.result.total > 0)
    .map(({ area }) => ({
      url: `${site.url}/areas/${area.slug}`,
      changeFrequency: "daily",
      priority: 0.7,
    }));

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

  return [...staticPages, ...propertyPages, ...projectPages, ...blogPages, ...locationPages, ...areaPages];
}
