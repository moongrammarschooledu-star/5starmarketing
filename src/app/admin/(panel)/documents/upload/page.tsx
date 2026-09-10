import { documentService } from "@/services/documentService";
import { dealService } from "@/services/dealService";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { DocumentUploadForm } from "@/components/admin/documents/DocumentUploadForm";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function UploadDocumentPage() {
  await requireSection("documents");
  const [types, dealsResult, properties, projects] = await Promise.all([
    documentService.listTypes(),
    dealService.search({ pageSize: 100 }),
    propertyService.list(),
    projectService.list(),
  ]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Upload Document</h1>
      <p className="mt-1 text-sm text-muted">PDF, JPG, PNG or WEBP — up to 15MB. Stored privately; never publicly accessible.</p>

      <div className="mt-6 max-w-3xl">
        <DocumentUploadForm
          types={types}
          deals={dealsResult.deals.map((d) => ({ id: d.id, dealNumber: d.dealNumber, customerId: d.customerId, propertyId: d.propertyId, projectId: d.projectId }))}
          properties={properties.map((p) => ({ id: p.id, title: p.title }))}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        />
      </div>
    </div>
  );
}
