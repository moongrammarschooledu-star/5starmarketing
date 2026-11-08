import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { PropertyCard } from "@/components/PropertyCard";
import { propertyService } from "@/services/propertyService";
import { site } from "@/lib/site";
import { lahoreAreas } from "@/lib/lahoreAreas";

export const dynamic = "force-static";
export const revalidate = 180;

type AreaPageProps = { params: Promise<{ slug: string }> };

function getArea(slug: string) {
  return lahoreAreas.find((area) => area.slug === slug);
}

export function generateStaticParams() {
  return lahoreAreas.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: AreaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const area = getArea(slug);
  if (!area) return { title: "Area Not Found", robots: { index: false, follow: true } };

  const result = await propertyService.search({ city: "Lahore", area: area.name, pageSize: 1 });
  const title = `Properties in ${area.name}, Lahore`;
  const description = `Explore currently listed houses, plots, flats and commercial properties in ${area.name}, Lahore. View real listings and contact 5STAR.M Estate & Builders.`;

  return {
    title,
    description,
    alternates: { canonical: `/areas/${area.slug}` },
    robots: result.total > 0 ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { title: `${title} | 5STAR.M Estate & Builders`, description, url: `${site.url}/areas/${area.slug}` },
    twitter: { card: "summary_large_image", title: `${title} | 5STAR.M Estate & Builders`, description },
  };
}

export default async function LahoreAreaPage({ params }: AreaPageProps) {
  const { slug } = await params;
  const area = getArea(slug);
  if (!area) notFound();

  const result = await propertyService.search({
    city: "Lahore",
    area: area.name,
    pageSize: 12,
    sort: "newest",
  });
  const otherAreaResults = await Promise.all(
    lahoreAreas
      .filter((item) => item.slug !== area.slug)
      .map(async (item) => {
        try {
          const areaResult = await propertyService.search({
            city: "Lahore",
            area: item.name,
            pageSize: 1,
          });
          return { ...item, hasListings: areaResult.total > 0 };
        } catch {
          return { ...item, hasListings: false };
        }
      }),
  );
  const availableOtherAreas = otherAreaResults.filter((item) => item.hasListings);
  // Build a small, factual area summary from the real listings shown on this page.
  // This gives each indexable Lahore area page useful unique context without
  // inventing amenities, prices, or neighbourhood claims.
  const listingExamples = Array.from(
    new Set(
      result.properties.slice(0, 3).map((property) =>
        `${property.size} ${property.type.toLowerCase()} ${property.purpose.toLowerCase()}`,
      ),
    ),
  );

  const areaUrl = `${site.url}/areas/${area.slug}`;
  const collectionJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Properties in ${area.name}, Lahore`,
    description: `Browse property listings in ${area.name}, Lahore.`,
    url: areaUrl,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: result.total,
      itemListElement: result.properties.map((property, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: property.title,
        url: `${site.url}/properties/${property.slug}`,
      })),
    },
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-14">
      {result.total > 0 && <JsonLd data={collectionJsonLd} />}
      <Breadcrumbs items={[{ label: "Locations", href: "/locations" }, { label: "Lahore" }, { label: area.name }]} />

      <div className="mt-5 max-w-3xl">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          <MapPin className="h-4 w-4" /> Lahore Property Guide
        </p>
        <h1 className="mt-3 font-heading text-3xl font-extrabold text-ink sm:text-4xl">
          Properties in {area.name}, Lahore
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Browse available property listings in {area.name}, Lahore with 5STAR.M Estate & Builders.
          Explore houses, residential plots, flats and commercial options based on the listings currently published on our website.
        </p>
        <p className="mt-3 text-sm font-semibold text-ink">
          {result.total} matching propert{result.total === 1 ? "y" : "ies"} currently listed
        </p>
        {listingExamples.length > 0 && (
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Current listings shown on this page include {listingExamples.join(", ")}.
            Details and availability are shown on each property listing.
          </p>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {result.properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>

      {result.total === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-semibold text-ink">No matching listings are available in {area.name} right now.</p>
          <p className="mt-2 text-sm text-muted">Browse all Lahore properties or contact our team about upcoming options.</p>
          <Link href="/properties?city=Lahore" className="mt-4 inline-flex items-center gap-2 font-bold text-primary hover:underline">
            Browse Lahore properties <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : result.total > result.properties.length ? (
        <div className="mt-8 text-center">
          <Link
            href={`/properties?city=Lahore&area=${encodeURIComponent(area.name.replace(/\s+/g, "-").toLowerCase())}`}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            View all {result.total} properties <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      <section className="mt-14 border-t border-border pt-8">
        <h2 className="font-heading text-xl font-bold text-ink">Explore other Lahore areas</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {availableOtherAreas.map((item) => (
            <Link key={item.slug} href={`/areas/${item.slug}`} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary">
              {item.name}
            </Link>
          ))}
          <Link href="/properties?city=Lahore" className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary">
            All Lahore properties
          </Link>
        </div>
      </section>
    </main>
  );
}
