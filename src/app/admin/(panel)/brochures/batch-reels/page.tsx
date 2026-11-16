import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { brochureService } from "@/services/brochureService";
import { propertyService } from "@/services/propertyService";
import { requireSection } from "@/lib/guard";
import { BatchReelMaker, type BatchItem } from "@/components/admin/BatchReelMaker";

export const metadata: Metadata = { title: "Batch Reel Maker" };
export const dynamic = "force-dynamic";

export default async function BatchReelsPage() {
  await requireSection("brochures");

  let items: BatchItem[] = [];
  let withoutBrochure = 0;
  let loadError: string | null = null;
  try {
    const [brochures, properties] = await Promise.all([brochureService.list(), propertyService.list()]);
    // Newest brochure first, so the first one seen for a property is its latest.
    const brochureFor = new Map<string, string>();
    for (const b of brochures) {
      if (b.type === "property" && b.propertyId && !brochureFor.has(b.propertyId)) brochureFor.set(b.propertyId, b.id);
    }
    for (const p of properties) {
      if (p.status !== "Available") continue;
      const brochureId = brochureFor.get(p.id);
      if (!brochureId) {
        withoutBrochure += 1;
        continue;
      }
      items.push({
        brochureId,
        serialNo: p.serialNo ?? "",
        slug: p.slug,
        title: p.title,
        purpose: p.purpose,
        price: p.price,
        location: p.location,
        // The pictures are stand-in stock photos until real ones are uploaded - no point making a video of those.
        hasRealPhoto: Boolean(p.images[0]) && !p.images[0].includes("unsplash.com"),
      });
    }
    // Sale first, then rent, newest serial number first within each.
    const order = (x: BatchItem) => (x.purpose === "For Rent" ? 1 : 0);
    items = items.sort((a, b) => order(a) - order(b) || b.serialNo.localeCompare(a.serialNo));
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load the properties.";
  }

  return (
    <div>
      <Link href="/admin/brochures" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Brochures
      </Link>
      <h1 className="mt-3 font-heading text-2xl font-extrabold text-ink">Batch Reel Maker</h1>
      <p className="mt-1 text-sm text-muted">
        Makes the vertical promo video (with background music) for many properties one after another, saves each one to your computer, and writes the TikTok caption for it.
      </p>
      {loadError ? (
        <p className="mt-6 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">{loadError}</p>
      ) : (
        <div className="mt-6">
          <BatchReelMaker items={items} withoutBrochure={withoutBrochure} />
        </div>
      )}
    </div>
  );
}
