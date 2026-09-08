import type { Metadata } from "next";
import { PropertiesBrowser } from "@/components/PropertiesBrowser";

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

export default function PropertiesPage() {
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
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            These are demo listings for illustration only — contact us on
            WhatsApp for real, current availability.
          </p>
        </div>

        <div className="mt-10">
          <PropertiesBrowser />
        </div>
      </div>
    </main>
  );
}
