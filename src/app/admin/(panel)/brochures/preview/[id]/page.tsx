import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brochureService } from "@/services/brochureService";
import { requireSection } from "@/lib/guard";
import { BrochurePreviewPanel } from "@/components/admin/BrochurePreviewPanel";
import { BrochurePreviewLoader } from "@/components/admin/BrochurePreviewLoader";

export const metadata: Metadata = { title: "Preview Brochure" };
export const dynamic = "force-dynamic";

export default async function BrochurePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("brochures");
  const { id } = await params;

  const brochure = await brochureService.getById(id);
  if (!brochure) notFound();

  let renderData: Awaited<ReturnType<typeof brochureService.buildRenderData>> | null = null;
  let loadError: string | null = null;
  try {
    renderData = await brochureService.buildRenderData(id);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load this brochure's data.";
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Brochure Preview</h1>
      <p className="mt-1 text-sm text-muted">This preview is the exact document that will be generated as a PDF.</p>

      <div className="mt-6">
        <BrochurePreviewPanel brochure={brochure} />
      </div>

      {loadError && (
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">{loadError}</div>
      )}

      {renderData && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border">
          <BrochurePreviewLoader
            type={brochure.type}
            sections={brochure.selectedSections}
            business={renderData.business}
            target={renderData.target}
            paymentPlan={renderData.paymentPlanInfo}
            qrCodes={renderData.qrCodes}
            badge={renderData.badge}
          />
        </div>
      )}
    </div>
  );
}
