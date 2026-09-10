import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { dealService } from "@/services/dealService";
import { documentService } from "@/services/documentService";
import { documentTemplateService } from "@/services/documentTemplateService";
import { DealChecklistProgressPanel } from "@/components/admin/documents/DealChecklistProgressPanel";
import { DealDocumentGenerationPanel } from "@/components/admin/documents/DealDocumentGenerationPanel";
import { DocumentUploadForm } from "@/components/admin/documents/DocumentUploadForm";
import { DealDocumentsList } from "@/components/admin/documents/DealDocumentsList";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function DealDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("deals");
  const { id } = await params;
  const deal = await dealService.getById(id);
  if (!deal) notFound();

  const [progress, documents, types, templates] = await Promise.all([
    documentService.getDealChecklistProgress(deal.id, deal.dealType, deal.propertyType),
    documentService.listByDeal(deal.id),
    documentService.listTypes(true),
    documentTemplateService.list(true),
  ]);

  return (
    <div>
      <Link href={`/admin/deals/${deal.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Deal
      </Link>

      <div className="mt-4">
        <h1 className="font-heading text-2xl font-extrabold text-ink">Documents — {deal.dealNumber}</h1>
        <p className="mt-1 text-sm text-muted">
          {deal.dealType} {deal.customerName ? `· ${deal.customerName}` : ""} {deal.propertyTitle ? `· ${deal.propertyTitle}` : ""}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DealChecklistProgressPanel progress={progress} />
          <DealDocumentsList documents={documents} />
        </div>
        <div className="space-y-6">
          <DealDocumentGenerationPanel dealId={deal.id} templates={templates.filter((t) => t.active)} />
          <DocumentUploadForm
            types={types}
            deals={[]}
            properties={[]}
            projects={[]}
            defaultDealId={deal.id}
            defaultCustomerId={deal.customerId ?? undefined}
            defaultPropertyId={deal.propertyId ?? undefined}
            defaultProjectId={deal.projectId ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}
