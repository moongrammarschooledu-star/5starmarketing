import { kbService } from "@/services/kbService";
import { FaqBrowser } from "@/components/support/FaqBrowser";
import { JsonLd } from "@/components/JsonLd";

export const metadata = { title: "FAQ — 5STAR.M Estate & Builders", alternates: { canonical: "/support/faq" } };
export const dynamic = "force-dynamic";

export default async function PublicFaqPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const articles = await kbService.listPublished(q);

  // FAQPage schema — only for the real, published Q&A content actually
  // rendered below (never fabricated, never applied to a page without
  // qualifying content per section 26).
  const faqJsonLd =
    articles.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: articles.map((a) => ({
            "@type": "Question",
            name: a.question,
            acceptedAnswer: { "@type": "Answer", text: a.answer },
          })),
        }
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      <h1 className="font-heading text-2xl font-extrabold text-ink">Frequently Asked Questions</h1>
      <p className="mt-1 text-sm text-muted">This support system is provided for service requests, communication and record management. Legal, financial or regulatory matters may require review by an appropriately qualified professional.</p>
      <form className="mt-4" action="/support/faq">
        <input name="q" defaultValue={q} placeholder="Search the knowledge base…" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
      </form>
      <div className="mt-6">
        <FaqBrowser articles={articles} />
      </div>
    </div>
  );
}
