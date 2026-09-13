import { documentService } from "@/services/documentService";
import { ConstructionDocumentManager } from "@/components/admin/construction/ConstructionDocumentManager";

const CONSTRUCTION_DOCUMENT_TYPE_CODES = [
  "CONSTRUCTION_CONTRACT",
  "BOQ_DOCUMENT",
  "CONSTRUCTION_DRAWING",
  "PURCHASE_ORDER_DOCUMENT",
  "SITE_REPORT_DOCUMENT",
  "CHANGE_ORDER_DOCUMENT",
  "CONSTRUCTION_CERTIFICATE",
  "HANDOVER_DOCUMENT",
];

export const dynamic = "force-dynamic";

export default async function ConstructionDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [documents, allTypes] = await Promise.all([documentService.listByConstructionProject(id), documentService.listTypes(true)]);
  const types = allTypes.filter((t) => CONSTRUCTION_DOCUMENT_TYPE_CODES.includes(t.code));

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink">Documents</h2>
      <p className="mt-1 text-xs text-muted">Files are stored in the existing secure Document Vault, filtered to this project.</p>
      <ConstructionDocumentManager projectId={id} documents={documents} types={types} />
    </div>
  );
}
