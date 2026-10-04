import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brochureService } from "@/services/brochureService";
import { requireSection } from "@/lib/guard";
import { BrochurePreviewPanel } from "@/components/admin/BrochurePreviewPanel";
import { BrochurePreviewLoader } from "@/components/admin/BrochurePreviewLoader";
import { FacebookPostPanel } from "@/components/admin/FacebookPostPanel";
import { ReelVideoPanel } from "@/components/admin/ReelVideoPanel";
import { buildFacebookCaptions } from "@/lib/facebookPost";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Preview Brochure" };
export const dynamic = "force-dynamic";

/** A brochure target is either a property's or a project's shape; the
 *  caption builder takes the union of both with every field optional. */
function postFields(target: object) {
  const t = target as {
    name: string;
    location: string;
    propertyType?: string;
    purpose?: string;
    size?: string;
    price?: string;
    features?: string[];
    amenities?: string[];
    projectStatus?: string;
    availablePropertyTypes?: string[];
    highlights?: string[];
  };
  return {
    name: t.name,
    location: t.location,
    propertyType: t.propertyType,
    purpose: t.purpose,
    size: t.size,
    price: t.price,
    features: t.features,
    amenities: t.amenities,
    projectStatus: t.projectStatus,
    availablePropertyTypes: t.availablePropertyTypes,
    highlights: t.highlights,
  };
}

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
        <div className="mt-6">
          <FacebookPostPanel
            brochureId={id}
            captions={buildFacebookCaptions({
              type: brochure.type,
              ...postFields(renderData.target),
              companyName: site.fullName,
              phones: [renderData.business.phone, site.phoneDisplay2],
              whatsappUrl: renderData.business.whatsappUrl,
              websiteUrl: renderData.target.publicUrl,
            })}
          />
        </div>
      )}

      {renderData && (
        <div className="mt-6">
          <ReelVideoPanel brochureId={id} />
        </div>
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
