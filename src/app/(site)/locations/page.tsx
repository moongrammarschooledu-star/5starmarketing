import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { site } from "@/lib/site";
import { lahoreAreas } from "@/lib/lahoreAreas";

// Public page: built once and kept for a few minutes (and rebuilt at once when
// the admin changes the related data), so visitors do not each run the server.
export const dynamic = "force-static";
export const revalidate = 180;

export const metadata: Metadata = {
  title: "Property Locations in Lahore & Across Pakistan | 5STAR.M",
  description: "Browse active property listings by city and explore houses, plots, flats and commercial properties in Lahore areas with 5STAR.M Estate & Builders.",
  alternates: { canonical: "/locations" },
};

function slugifyCity(city: string) {
  return city.toLowerCase().trim().replace(/\s+/g, "-");
}

export default async function LocationsPage() {
  const cities = await propertyService.listDistinctCities();
  const counts = await Promise.all(cities.map((city) => propertyService.search({ city, pageSize: 1 })));
  const areaResults = await Promise.all(
    lahoreAreas.map(async (area) => {
      try {
        const result = await propertyService.search({ city: "Lahore", area: area.name, pageSize: 1 });
        return { ...area, total: result.total };
      } catch {
        return { ...area, total: 0 };
      }
    }),
  );
  const availableAreas = areaResults.filter((area) => area.total > 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-14 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">Property Discovery</p>
      <h1 className="mt-2 font-heading text-3xl font-extrabold text-ink">Browse Property Locations in Lahore & Beyond</h1>
      <p className="mt-2 text-sm text-muted">Explore real, currently-listed properties grouped by city, with dedicated links to Lahore localities.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cities.map((city, i) => (
          <Link
            key={city}
            href={`/locations/${slugifyCity(city)}`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="font-heading text-sm font-bold text-ink">{city}</p>
              <p className="text-xs text-muted">{counts[i].total} propert{counts[i].total === 1 ? "y" : "ies"}</p>
            </div>
          </Link>
        ))}
        {cities.length === 0 && <p className="col-span-full text-sm text-muted">No locations available yet.</p>}
      </div>

      {availableAreas.length > 0 && (
        <section className="mt-12 border-t border-border pt-8" aria-labelledby="lahore-area-heading">
          <h2 id="lahore-area-heading" className="font-heading text-xl font-bold text-ink">Explore Properties by Area in Lahore</h2>
          <p className="mt-2 text-sm text-muted">Browse matching active listings in these Lahore localities.</p>
          <nav aria-label="Lahore property areas" className="mt-4 flex flex-wrap gap-3">
            {availableAreas.map((area) => (
              <Link
                key={area.slug}
                href={`/areas/${area.slug}`}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
              >
                Properties in {area.name}
              </Link>
            ))}
          </nav>
        </section>
      )}

      <p className="mt-10 text-xs text-muted">
        Looking for something specific? <Link href="/properties" className="font-bold text-primary hover:underline">Search all properties</Link> or{" "}
        <a href={`https://wa.me/${site.whatsappNumber}`} className="font-bold text-primary hover:underline">chat with us on WhatsApp</a>.
      </p>
    </main>
  );
}
