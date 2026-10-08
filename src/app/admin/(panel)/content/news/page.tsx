import type { Metadata } from "next";
import { requireSection } from "@/lib/guard";
import { siteNewsService } from "@/services/siteNewsService";
import { NewsManager } from "@/components/admin/NewsManager";

export const metadata: Metadata = { title: "News Bar" };
export const dynamic = "force-dynamic";

export default async function AdminNewsPage() {
  await requireSection("content");
  const [news, demandItems] = await Promise.all([siteNewsService.listAll().catch(() => []), siteNewsService.listPublicDemandItems()]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">News Bar</h1>
      <p className="mt-1 text-sm text-muted">
        The scrolling bar at the top of the public website: your news, plus the clients&apos; demands (without their name or number).
      </p>
      <div className="mt-6">
        <NewsManager news={news} demandItems={demandItems} />
      </div>
    </div>
  );
}
