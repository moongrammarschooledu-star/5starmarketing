import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { PropertiesBrowser } from "@/components/PropertiesBrowser";
import { propertyService } from "@/services/propertyService";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Properties",
  description:
    "Browse houses, flats, residential plots and commercial properties with 5STAR.M Estate & Builders in Lahore. Filter by type, purpose, location, size and budget.",
  openGraph: {
    title: "Properties | 5STAR.M Estate & Builders",
    description:
      "Browse houses, flats, residential plots and commercial properties with 5STAR.M Estate & Builders in Lahore.",
  },
};

export default async function PropertiesPage() {
  let properties: Awaited<ReturnType<typeof propertyService.list>> = [];
  let loadError = !isSupabaseConfigured();

  if (!loadError) {
    try {
      properties = await propertyService.list();
    } catch {
      loadError = true;
    }
  }

  return (
    <main className="bg-surface-muted">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            <span className="h-px w-8 bg-current" />
            Property Discovery
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Find Your Perfect Property
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Explore houses, flats, plots and commercial properties with 5STAR.M
            Estate &amp; Builders.
          </p>
        </div>

        <div className="mt-10">
          {loadError ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <Building2 className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-semibold text-ink">Properties are temporarily unavailable</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                We couldn&apos;t load listings right now — please check back shortly, or contact
                us directly on WhatsApp.
              </p>
            </div>
          ) : (
            <PropertiesBrowser properties={properties} />
          )}
        </div>
      </div>
    </main>
  );
}
