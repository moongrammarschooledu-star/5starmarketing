import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { lahoreAreas } from "@/lib/lahoreAreas";

/**
 * Internal links to locality pages are shown only when the area has real
 * matching Lahore listings, keeping the homepage useful and avoiding thin links.
 */
export async function LahoreAreaLinks() {
  const results = await Promise.all(
    lahoreAreas.map(async (area) => {
      try {
        const result = await propertyService.search({
          city: "Lahore",
          area: area.name,
          pageSize: 1,
        });
        return { ...area, total: result.total };
      } catch {
        return { ...area, total: 0 };
      }
    }),
  );

  const availableAreas = results.filter((area) => area.total > 0);
  if (availableAreas.length === 0) return null;

  return (
    <section className="bg-surface-muted py-14 sm:py-16" aria-labelledby="lahore-area-links-title">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            <MapPin className="h-4 w-4" /> Explore by location
          </p>
          <h2 id="lahore-area-links-title" className="mt-3 font-heading text-2xl font-extrabold text-ink sm:text-3xl">
            Properties in Popular Lahore Areas
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            Browse current property listings by area. Each location page shows matching properties published on our website.
          </p>
        </div>

        <nav aria-label="Lahore property areas" className="mt-7 flex flex-wrap gap-3">
          {availableAreas.map((area) => (
            <Link
              key={area.slug}
              href={`/areas/${area.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-3 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary"
            >
              Properties in {area.name} <ArrowRight className="h-4 w-4" />
            </Link>
          ))}
          <Link
            href="/properties?city=Lahore"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            All Lahore properties <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </div>
    </section>
  );
}
