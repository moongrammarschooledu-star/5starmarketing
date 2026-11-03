import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { PropertyCard } from "./PropertyCard";
import { propertyService } from "@/services/propertyService";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { Purpose } from "@/lib/models/property";
import { PURPOSE_SLUG } from "@/lib/propertyPurpose";

type Loaded = Awaited<ReturnType<typeof propertyService.search>>;

async function load(purpose: Purpose): Promise<Loaded> {
  const empty: Loaded = { properties: [], total: 0, page: 1, pageSize: 3, totalPages: 1 };
  if (!isSupabaseConfigured()) return empty;
  try {
    return await propertyService.search({ purpose, pageSize: 3, sort: "newest" });
  } catch (e) {
    console.error(`FeaturedProperties: failed to load ${purpose} properties:`, e);
    return empty;
  }
}

function Part({
  id,
  purpose,
  data,
  eyebrow,
  title,
  highlight,
  description,
  emptyText,
  tone,
}: {
  id: string;
  purpose: Purpose;
  data: Loaded;
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
  emptyText: string;
  tone: "light" | "muted";
}) {
  const href = `/properties?purpose=${PURPOSE_SLUG[purpose]}`;
  return (
    <section id={id} className={`${tone === "light" ? "bg-surface" : "bg-surface-muted"} py-16 sm:py-20`}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading eyebrow={eyebrow} title={title} highlight={highlight} description={description} />
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            {data.total > 3 ? `View all ${data.total} ${purpose.toLowerCase()}` : `View all ${purpose.toLowerCase()}`} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {data.properties.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-14 text-center">
            <Home className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-semibold text-ink">{emptyText}</p>
            <p className="mt-1 max-w-sm text-sm text-muted">Tell us what you need and we will find it for you.</p>
            <Link
              href="/#contact"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
            >
              Contact Us <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** The home page's property area, split in two: what is for sale and what is for rent. */
export async function FeaturedProperties() {
  const [sale, rent] = await Promise.all([load("For Sale"), load("For Rent")]);

  return (
    <>
      <Part
        id="properties"
        purpose="For Sale"
        data={sale}
        eyebrow="Buy"
        title="Properties for"
        highlight="Sale"
        description="Houses, flats, plots and commercial properties you can buy, with clear details and prices."
        emptyText="No properties for sale are listed right now"
        tone="light"
      />
      <Part
        id="rent"
        purpose="For Rent"
        data={rent}
        eyebrow="Rent"
        title="Properties for"
        highlight="Rent"
        description="Houses, flats and commercial properties available on rent in the best areas of Lahore."
        emptyText="No properties for rent are listed right now"
        tone="muted"
      />
    </>
  );
}
