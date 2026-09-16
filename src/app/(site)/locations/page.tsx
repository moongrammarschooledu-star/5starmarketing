import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse Properties by Location",
  description: "Explore properties for sale and rent across Lahore and other locations with 5STAR.M Estate & Builders.",
  alternates: { canonical: "/locations" },
};

function slugifyCity(city: string) {
  return city.toLowerCase().trim().replace(/\s+/g, "-");
}

export default async function LocationsPage() {
  const cities = await propertyService.listDistinctCities();
  const counts = await Promise.all(cities.map((city) => propertyService.search({ city, pageSize: 1 })));

  return (
    <main className="mx-auto max-w-5xl px-4 py-14 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">Property Discovery</p>
      <h1 className="mt-2 font-heading text-3xl font-extrabold text-ink">Browse Properties by Location</h1>
      <p className="mt-2 text-sm text-muted">Real, currently-listed properties — grouped by city.</p>

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

      <p className="mt-10 text-xs text-muted">
        Looking for something specific? <Link href="/properties" className="font-bold text-primary hover:underline">Search all properties</Link> or{" "}
        <a href={`https://wa.me/${site.whatsappNumber}`} className="font-bold text-primary hover:underline">chat with us on WhatsApp</a>.
      </p>
    </main>
  );
}
