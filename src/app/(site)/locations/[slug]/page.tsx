import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FolderKanban, ArrowRight } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { PropertyCard } from "@/components/PropertyCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

function slugifyCity(city: string) {
  return city.toLowerCase().trim().replace(/\s+/g, "-");
}

async function resolveCity(slug: string): Promise<string | undefined> {
  const cities = await propertyService.listDistinctCities();
  return cities.find((c) => slugifyCity(c) === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const city = await resolveCity(slug);
  if (!city) return { title: "Location Not Found" };
  const title = `Properties in ${city}`;
  const description = `Browse real, currently-listed houses, flats and commercial properties for sale and rent in ${city} with 5STAR.M Estate & Builders.`;
  return {
    title,
    description,
    alternates: { canonical: `/locations/${slug}` },
    openGraph: { title: `${title} | 5STAR.M Estate & Builders`, description, url: `${site.url}/locations/${slug}` },
  };
}

export default async function LocationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = await resolveCity(slug);
  if (!city) notFound();

  const [result, allProjects] = await Promise.all([
    propertyService.search({ city, pageSize: 12, sort: "newest" }),
    projectService.listPublished(),
  ]);
  const cityProjects = allProjects.filter((p) => p.location.toLowerCase().includes(city.toLowerCase()));

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-14">
      <Breadcrumbs items={[{ label: "Locations", href: "/locations" }, { label: city }]} />

      <h1 className="mt-4 font-heading text-3xl font-extrabold text-ink">Properties in {city}</h1>
      <p className="mt-2 text-sm text-muted">
        {result.total} propert{result.total === 1 ? "y" : "ies"} currently listed in {city}.
      </p>

      {cityProjects.length > 0 && (
        <div className="mt-8">
          <h2 className="font-heading text-lg font-bold text-ink">Projects in {city}</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {cityProjects.map((p) => (
              <Link key={p.id} href={`/projects/${p.slug}`} className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
                <FolderKanban className="h-3.5 w-3.5 text-primary" /> {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {result.properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
        {result.properties.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted">
            No properties currently listed in {city}. <Link href="/properties" className="font-bold text-primary hover:underline">Browse all properties</Link> instead.
          </p>
        )}
      </div>

      {result.total > result.properties.length && (
        <div className="mt-8 text-center">
          <Link
            href={`/properties?city=${encodeURIComponent(city)}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            View All {result.total} Properties in {city} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </main>
  );
}
