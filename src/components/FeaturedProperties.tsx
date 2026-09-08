import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { PropertyCard } from "./PropertyCard";
import { propertiesRepository } from "@/lib/repositories/properties.repository";

export async function FeaturedProperties() {
  const featured = await propertiesRepository.listFeatured(3);

  return (
    <section id="properties" className="bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Featured Listings"
            title="Featured"
            highlight="Properties"
            description="A sample of the kind of houses, flats, plots and commercial properties we help clients buy, sell and invest in."
          />
          <Link
            href="/properties"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            View All Properties <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </div>
    </section>
  );
}
