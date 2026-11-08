import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { blogService } from "@/services/blogService";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { lahoreAreas } from "@/lib/lahoreAreas";

function slugifyCity(city: string) {
  return city.toLowerCase().trim().replace(/\\s+/g, "-");
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

  try {
    const [properties, projects, blogPosts, cities, areaResults] = await Promise.all([
      propertyService.list(),
      projectService.listPublished(),
      blogService.listPublished(undefined, 1000),
      propertyService.listDistinctCities(),
      Promise.all(lahoreAreas.map(async (area) => ({
        area,
        result: await propertyService.search({ city: "Lahore", area: area.name, pageSize: 1 }),
      }))),
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

    // Only include curated locality pages when real active listings match.
    const areaPages: MetadataRoute.Sitemap = areaResults
      .filter(({ result }) => result.total > 0)
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
  } catch (e) {
    console.error("sitemap: failed to load dynamic pages:", e);
    return staticPages;
  }
}
