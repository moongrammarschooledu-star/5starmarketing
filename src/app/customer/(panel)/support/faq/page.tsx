import { kbService } from "@/services/kbService";
import { FaqBrowser } from "@/components/support/FaqBrowser";

export const metadata = { title: "FAQ" };
export const dynamic = "force-dynamic";

export default async function CustomerFaqPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const articles = await kbService.listPublished(q);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Frequently Asked Questions</h1>
      <form className="mt-4" action="/customer/support/faq">
        <input name="q" defaultValue={q} placeholder="Search the knowledge base…" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
      </form>
      <div className="mt-6">
        <FaqBrowser articles={articles} />
      </div>
    </div>
  );
}
