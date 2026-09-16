import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { landingPageService } from "@/services/landingPageService";
import { LandingPageInquiryForm } from "@/components/LandingPageInquiryForm";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await landingPageService.getBySlug(slug);
  if (!page) return { title: "Page Not Found" };
  const title = page.seoTitle || page.title;
  const description = page.seoDescription || page.description.slice(0, 160);
  return {
    title,
    description,
    // Campaign landing pages are intentionally noindex — they exist to
    // convert traffic FROM a specific ad/campaign, not to compete with
    // the site's own real property/project pages in organic search.
    robots: { index: false, follow: true },
    alternates: { canonical: `/landing/${slug}` },
    openGraph: {
      title: `${title} | 5STAR.M Estate & Builders`,
      description,
      url: `${site.url}/landing/${slug}`,
      images: page.ogImage ? [{ url: page.ogImage }] : page.heroImage ? [{ url: page.heroImage }] : undefined,
    },
  };
}

export default async function CampaignLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await landingPageService.getBySlug(slug);
  if (!page) notFound();

  const faqJsonLd =
    page.faqItems.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: page.faqItems.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  return (
    <main>
      {faqJsonLd && <JsonLd data={faqJsonLd} />}

      {page.heroImage && (
        <div className="relative h-64 w-full sm:h-80">
          <Image src={page.heroImage} alt={page.title} fill sizes="100vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-4 pb-8 lg:px-8">
            <h1 className="font-heading text-3xl font-extrabold text-white sm:text-4xl">{page.title}</h1>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
        {!page.heroImage && <h1 className="font-heading text-3xl font-extrabold text-ink">{page.title}</h1>}

        <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <p className="whitespace-pre-wrap text-base leading-relaxed text-muted">{page.description}</p>

            {page.propertyTitle && page.propertySlug && (
              <Link href={`/properties/${page.propertySlug}`} className="mt-4 inline-block rounded-full border-2 border-primary/30 bg-primary/5 px-4 py-2 text-sm font-bold text-primary">
                Featured: {page.propertyTitle}
              </Link>
            )}
            {page.projectName && page.projectSlug && (
              <Link href={`/projects/${page.projectSlug}`} className="mt-4 inline-block rounded-full border-2 border-primary/30 bg-primary/5 px-4 py-2 text-sm font-bold text-primary">
                Featured Project: {page.projectName}
              </Link>
            )}

            {page.faqItems.length > 0 && (
              <div className="mt-10">
                <h2 className="font-heading text-lg font-bold text-ink">Frequently Asked Questions</h2>
                <div className="mt-4 space-y-4">
                  {page.faqItems.map((f, i) => (
                    <div key={i} className="rounded-xl border border-border bg-surface p-4">
                      <p className="text-sm font-bold text-ink">{f.question}</p>
                      <p className="mt-1.5 text-sm text-muted">{f.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <LandingPageInquiryForm
              slug={page.slug}
              ctaLabel={page.ctaLabel}
              propertyId={page.propertyId}
              propertyTitle={page.propertyTitle}
              projectId={page.projectId}
              projectTitle={page.projectName}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
