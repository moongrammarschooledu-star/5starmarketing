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
import { socialStatus } from "@/lib/social/meta";
import { ownerDetailsService } from "@/services/ownerDetailsService";
import { BrochureOwnerSend } from "@/components/admin/BrochureOwnerSend";

export const metadata: Metadata = { title: "Preview Brochure" };
export const dynamic = "force-dynamic";
// Posting to Facebook / Instagram can take a little while.
export const maxDuration = 60;

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

  // The owner's private number, so the brochure can be sent to them straight away.
  let owner: Awaited<ReturnType<typeof ownerDetailsService.getForProperty>>;
  let ownerFailed = false;
  try {
    owner =
      brochure.type === "property" && brochure.propertyId
        ? await ownerDetailsService.getForProperty(brochure.propertyId)
        : brochure.projectId
          ? await ownerDetailsService.getForProject(brochure.projectId)
          : undefined;
  } catch {
    ownerFailed = true;
  }
  const targetName = (renderData?.target as { name?: string } | undefined)?.name ?? brochure.title;
  const ownerNumber = owner?.phone?.trim() || owner?.altPhone?.trim();

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Brochure Preview</h1>
      <p className="mt-1 text-sm text-muted">This preview is the exact document that will be generated as a PDF.</p>

      <div className="mt-6">
        <BrochurePreviewPanel brochure={brochure} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-5">
        <div className="min-w-0">
          <h2 className="font-heading text-sm font-bold text-ink">Send to the owner</h2>
          <p className="mt-1 text-xs text-muted">
            {ownerFailed
              ? "The owner's number could not be loaded just now."
              : ownerNumber
                ? `${owner?.name || "Owner"} - ${ownerNumber}`
                : `No owner number is saved for this ${brochure.type} yet.`}
          </p>
        </div>
        <BrochureOwnerSend
          variant="button"
          loadFailed={ownerFailed}
          owner={owner}
          brochure={{
            id: brochure.id,
            title: brochure.title,
            slug: brochure.slug,
            type: brochure.type,
            targetName,
            generatedFile: brochure.generatedFile,
            public: brochure.public,
            propertyId: brochure.propertyId,
            projectId: brochure.projectId,
          }}
        />
      </div>

      {loadError && (
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">{loadError}</div>
      )}

      {renderData && (
        <div className="mt-6">
          <FacebookPostPanel
            brochureId={id}
            social={socialStatus()}
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
