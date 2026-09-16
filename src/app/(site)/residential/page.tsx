import type { Metadata } from "next";
import Link from "next/link";
import { Home, Building2, MapPin, ArrowRight } from "lucide-react";
import { site } from "@/lib/site";

// Unlike /buy, /rent, /commercial (each a single filter value the
// search page already supports), "Residential" spans three distinct
// property_type values (house/flat/residential_plot) — the search
// URL's `type` param only ever accepts one at a time, so a single
// redirect here would silently under-represent the category. A small
// real hub page is the honest option rather than picking one type and
// calling it "Residential".
export const metadata: Metadata = {
  title: "Residential Properties in Lahore",
  description: "Browse houses, flats and residential plots for sale and rent in Lahore with 5STAR.M Estate & Builders.",
  alternates: { canonical: "/residential" },
  openGraph: { title: "Residential Properties in Lahore | 5STAR.M Estate & Builders", url: `${site.url}/residential` },
};

const CATEGORIES = [
  { href: "/property-types/house", label: "Houses", icon: Home },
  { href: "/property-types/flat", label: "Flats & Apartments", icon: Building2 },
  { href: "/property-types/residential-plot", label: "Residential Plots", icon: MapPin },
];

export default function ResidentialHubPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-14 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">Property Discovery</p>
      <h1 className="mt-2 font-heading text-3xl font-extrabold text-ink">Residential Properties in Lahore</h1>
      <p className="mt-2 text-sm text-muted">Choose a category to browse real, currently-listed residential properties.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CATEGORIES.map((c) => (
          <Link key={c.href} href={c.href} className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center hover:border-primary">
            <c.icon className="h-7 w-7 text-primary" />
            <span className="font-heading text-sm font-bold text-ink">{c.label}</span>
            <span className="flex items-center gap-1 text-xs font-bold text-primary">
              Browse <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
