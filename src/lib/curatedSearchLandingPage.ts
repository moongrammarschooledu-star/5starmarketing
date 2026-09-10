import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { site } from "./site";

/** Factory for the curated, memorable /properties/<slug> entry points
 *  (section 40) — each one is a real, indexable URL in search engines'
 *  eyes via its own metadata, but immediately redirects a human visitor
 *  to the single canonical filtered search URL (/properties?...) rather
 *  than rendering five duplicate copies of the same search experience.
 *  This is the standard way to avoid duplicate-content SEO issues while
 *  still giving each curated angle its own clean, shareable link. */
export function createCuratedSearchLandingPage(opts: { title: string; description: string; query: string }) {
  const target = `/properties?${opts.query}`;
  // `title` is the SHORT form (e.g. "Properties for Sale in Lahore") —
  // the root layout's title template ("%s | 5STAR.M Estate & Builders")
  // appends the brand suffix for the <title> tag; OG/Twitter don't use
  // that template, so they need the fully-qualified string themselves.
  const fullTitle = `${opts.title} | 5STAR.M Estate & Builders`;

  const metadata: Metadata = {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: target },
    openGraph: { title: fullTitle, description: opts.description, url: `${site.url}${target}` },
    twitter: { card: "summary_large_image", title: fullTitle, description: opts.description },
  };

  function Page(): never {
    redirect(target);
  }

  return { metadata, Page };
}
