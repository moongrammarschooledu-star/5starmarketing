import { documentService } from "@/services/documentService";
import { dealService } from "@/services/dealService";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { DocumentUploadForm } from "@/components/admin/documents/DocumentUploadForm";
import { requireSection } from "@/lib/guard";
import type { RawSearchParams } from "@/lib/documentSearchParams";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined): string | undefined {
  return (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 60) || undefined;
}

export default async function UploadDocumentPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireSection("documents");
  const sp = await searchParams;
  // Opened from a contact / property / lead / lease: that record is already filled in.
  const contactId = one(sp.contact);
  const leadId = one(sp.lead);
  const leaseId = one(sp.lease);
  const customerId = one(sp.customer);
  const defaultPropertyId = one(sp.property);

  const [types, dealsResult, properties, projects, contact, lead, lease, customer] = await Promise.all([
    documentService.listTypes(),
    dealService.search({ pageSize: 100 }),
    propertyService.list(),
    projectService.list(),
    contactId ? documentService.getTarget("contact", contactId) : undefined,
    leadId ? documentService.getTarget("lead", leadId) : undefined,
    leaseId ? documentService.getTarget("lease", leaseId) : undefined,
    customerId ? documentService.getTarget("customer", customerId) : undefined,
  ]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Upload Documents</h1>
      <p className="mt-1 text-sm text-muted">
        PDF, JPG, PNG or WEBP - up to 15MB each. You can choose many files at once, or take a photo with the phone camera. Stored privately; never publicly accessible.
      </p>

      <div className="mt-6 max-w-3xl">
        <DocumentUploadForm
          types={types}
          deals={dealsResult.deals.map((d) => ({ id: d.id, dealNumber: d.dealNumber, customerId: d.customerId, propertyId: d.propertyId, projectId: d.projectId }))}
          properties={properties.map((p) => ({ id: p.id, title: p.title }))}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          defaultPropertyId={defaultPropertyId && properties.some((p) => p.id === defaultPropertyId) ? defaultPropertyId : undefined}
          defaultTargets={{ contact, lead, lease, customer }}
        />
      </div>
    </div>
  );
}
