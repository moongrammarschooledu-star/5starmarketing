import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { PropertySearchExperience } from "@/components/properties/PropertySearchExperience";
import { RetryLink } from "@/components/properties/RetryLink";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { settingsService } from "@/services/settingsService";
import { customerService } from "@/services/customerService";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { parsePropertySearchParams, isDeepFilterCombination, type RawSearchParams } from "@/lib/propertySearchParams";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const sp = await searchParams;
  const filters = parsePropertySearchParams(sp);

  const TYPE_PLURAL: Record<string, string> = {
    House: "Houses",
    Flat: "Flats",
    "Residential Plot": "Residential Plots",
    "Commercial Property": "Commercial Properties",
  };
  let title = filters.type ? TYPE_PLURAL[filters.type] : "Properties";
  if (filters.purpose) title += filters.purpose === "For Rent" ? " for Rent" : filters.purpose === "For Sale" ? " for Sale" : " for Investment";
  if (filters.area) title += ` in ${filters.area}`;
  else if (filters.city) title += ` in ${filters.city}`;
  // Short title — the root layout's title template ("%s | 5STAR.M
  // Estate & Builders") appends the brand suffix automatically; adding
  // it here too would double it up.
  const fullTitle = `${title} | 5STAR.M Estate & Builders`;
  const description =
    "Browse houses, flats, residential plots and commercial properties with 5STAR.M Estate & Builders in Lahore. Filter by type, purpose, location, size, price, bedrooms and more — with an interactive map.";

  // Curated 1-2-filter combinations stay indexable and get a real
  // canonical; long-tail combinations (3+ filters, a keyword search, a
  // specific page/sort/bounds) are noindexed so search engines never
  // treat every possible filter permutation as a distinct page.
  const deep = isDeepFilterCombination(filters) || !!filters.page || !!filters.bounds;

  return {
    title,
    description,
    alternates: { canonical: "/properties" },
    robots: deep ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { title: fullTitle, description, url: `${site.url}/properties` },
    twitter: { card: "summary_large_image", title: fullTitle, description },
  };
}

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const filters = parsePropertySearchParams(sp);

  let loadError = !isSupabaseConfigured();
  let result: Awaited<ReturnType<typeof propertyService.search>> = { properties: [], total: 0, page: 1, pageSize: 24, totalPages: 1 };
  let mapProperties: Awaited<ReturnType<typeof propertyService.searchForMap>> = [];
  let cityOptions: string[] = [];
  let amenityOptions: string[] = [];
  let projects: { id: string; name: string }[] = [];
  let isLoggedIn = false;
  let businessCenter: { latitude: number; longitude: number } | undefined;

  if (!loadError) {
    try {
      const [searchResult, mapResult, cities, amenities, projectList, settings, customer] = await Promise.all([
        propertyService.search(filters),
        propertyService.searchForMap(filters),
        propertyService.listDistinctCities(),
        propertyService.listDistinctAmenities(),
        projectService.list(),
        settingsService.get().catch(() => null),
        customerService.getCurrentCustomer().catch(() => null),
      ]);
      result = searchResult;
      mapProperties = mapResult;
      cityOptions = cities;
      amenityOptions = amenities;
      projects = projectList.map((p) => ({ id: p.id, name: p.name }));
      isLoggedIn = !!customer;
      if (settings?.latitude !== undefined && settings?.longitude !== undefined) {
        businessCenter = { latitude: settings.latitude, longitude: settings.longitude };
      }
    } catch (e) {
      console.error("PropertiesPage load failed:", e);
      loadError = true;
    }
  }

  return (
    <main className="bg-surface-muted">
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-14">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            <span className="h-px w-8 bg-current" />
            Property Discovery
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Find Your Perfect Property</h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Search, filter and explore houses, flats, plots and commercial properties with 5STAR.M Estate &amp; Builders — by
            keyword, location, budget or directly on the map.
          </p>
        </div>

        <div className="mt-8">
          {loadError ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <Building2 className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-semibold text-ink">Unable to load properties right now.</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Please check back shortly, or contact us directly on WhatsApp.
              </p>
              <RetryLink />
            </div>
          ) : (
            <PropertySearchExperience
              initialResult={result}
              mapProperties={mapProperties}
              cityOptions={cityOptions}
              amenityOptions={amenityOptions}
              projects={projects}
              isLoggedIn={isLoggedIn}
              businessCenter={businessCenter}
            />
          )}
        </div>
      </div>
    </main>
  );
}
