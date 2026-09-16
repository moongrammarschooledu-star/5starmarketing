import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { site } from "@/lib/site";

// Only the FOUR property types this codebase's data model actually
// distinguishes (properties.property_type's own check constraint) get a
// real page — "Apartments"/"Shops"/"Offices"/"Commercial Plots" from the
// spec's example list aren't separate database categories here (they'd
// all fall under "flat" or "commercial"), so publishing pages for them
// would be publishing a category that doesn't exist in the data.
const TYPE_COPY: Record<string, { title: string; description: string }> = {
  house: { title: "Houses for Sale & Rent in Lahore", description: "Browse houses for sale and rent in Lahore with 5STAR.M Estate & Builders." },
  flat: { title: "Flats & Apartments for Sale & Rent in Lahore", description: "Browse flats and apartments for sale and rent in Lahore with 5STAR.M Estate & Builders." },
  "residential-plot": { title: "Residential Plots for Sale in Lahore", description: "Browse residential plots for sale in Lahore with 5STAR.M Estate & Builders." },
  commercial: { title: "Commercial Properties for Sale & Rent in Lahore", description: "Browse commercial properties, shops and offices for sale and rent in Lahore with 5STAR.M Estate & Builders." },
};

const SLUG_TO_TYPE_PARAM: Record<string, string> = {
  house: "house",
  flat: "flat",
  "residential-plot": "plot",
  commercial: "commercial",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const copy = TYPE_COPY[slug];
  if (!copy) return { title: "Property Type Not Found" };
  const fullTitle = `${copy.title} | 5STAR.M Estate & Builders`;
  const target = `/properties?type=${SLUG_TO_TYPE_PARAM[slug]}`;
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: target },
    openGraph: { title: fullTitle, description: copy.description, url: `${site.url}${target}` },
    twitter: { card: "summary_large_image", title: fullTitle, description: copy.description },
  };
}

export default async function PropertyTypePage({ params }: { params: Promise<{ slug: string }> }): Promise<never> {
  const { slug } = await params;
  const typeParam = SLUG_TO_TYPE_PARAM[slug];
  if (!typeParam) notFound();
  redirect(`/properties?type=${typeParam}`);
}
