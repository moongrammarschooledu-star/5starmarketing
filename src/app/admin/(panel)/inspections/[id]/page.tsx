import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { propertyInspectionService } from "@/services/propertyInspectionService";
import { propertyDefectService } from "@/services/propertyDefectService";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { INSPECTION_ALLOWED_TRANSITIONS } from "@/lib/models/maintenance";
import { InspectionStatusActions } from "@/components/admin/maintenance/InspectionStatusActions";
import { InspectionChecklist } from "@/components/admin/maintenance/InspectionChecklist";
import { InspectionPhotoUpload } from "@/components/admin/maintenance/InspectionPhotoUpload";
import { InspectionDetailsForm } from "@/components/admin/maintenance/InspectionDetailsForm";
import { GenerateInspectionReportButton } from "@/components/admin/maintenance/GenerateInspectionReportButton";

export const dynamic = "force-dynamic";

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("maintenance");
  const { id } = await params;
  const [inspection, results, photos, defects] = await Promise.all([
    propertyInspectionService.getById(id),
    propertyInspectionService.listResults(id),
    propertyInspectionService.listPhotos(id),
    propertyDefectService.list({ inspectionId: id }),
  ]);
  if (!inspection) notFound();

  return (
    <div>
      <Link href="/admin/inspections" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Inspections
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{inspection.inspectionNumber}</h1>
          <p className="mt-1 text-sm text-muted">
            {inspection.propertyTitle ?? "Property"} · {inspection.inspectionType.replace(/_/g, " ")} · Inspector: {inspection.inspectorName ?? "Unassigned"}
          </p>
        </div>
        <StatusBadge status={inspection.status} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <InspectionStatusActions inspectionId={inspection.id} allowed={INSPECTION_ALLOWED_TRANSITIONS[inspection.status]} />
        {(inspection.status === "COMPLETED" || inspection.status === "REVIEW_REQUIRED" || inspection.status === "APPROVED") && <GenerateInspectionReportButton inspectionId={inspection.id} hasDocument={!!inspection.documentId} />}
      </div>

      <div className="mt-6">
        <InspectionDetailsForm inspectionId={inspection.id} overallCondition={inspection.overallCondition} notes={inspection.notes} recommendations={inspection.recommendations} />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Checklist</h2>
        <InspectionChecklist inspectionId={inspection.id} propertyId={inspection.propertyId} results={results} />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Photos</h2>
        <InspectionPhotoUpload inspectionId={inspection.id} propertyId={inspection.propertyId} photos={photos} />
      </div>

      {defects.length > 0 && (
        <div className="mt-8">
          <h2 className="font-heading text-lg font-bold text-ink">Defects Raised</h2>
          <div className="mt-3 space-y-2">
            {defects.map((d) => (
              <Link key={d.id} href={`/admin/maintenance/requests`} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3.5 hover:border-primary">
                <div>
                  <p className="text-sm font-semibold text-ink">{d.category}</p>
                  <p className="text-xs text-muted">{d.description}</p>
                </div>
                <StatusBadge status={d.status} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 flex items-start gap-2 rounded-xl bg-surface-muted p-4 text-xs text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" /> Photos are stored privately and only ever accessed via a short-lived signed link, never a public URL.
      </p>
    </div>
  );
}
