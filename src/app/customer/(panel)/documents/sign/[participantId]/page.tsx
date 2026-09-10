import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { customerService } from "@/services/customerService";
import { documentSignatureService, LEGAL_DISCLAIMER } from "@/services/documentSignatureService";
import { documentService } from "@/services/documentService";
import { CustomerSignatureForm } from "@/components/customer/CustomerSignatureForm";
import { DocumentPreviewPanel } from "@/components/admin/documents/DocumentPreviewPanel";

export const metadata = { title: "Sign Document" };
export const dynamic = "force-dynamic";

export default async function CustomerSignPage({ params }: { params: Promise<{ participantId: string }> }) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const { participantId } = await params;
  const pending = await documentSignatureService.listPendingForCustomer(customer.id);
  const match = pending.find((row) => row.participant.id === participantId);
  if (!match) notFound();

  const doc = await documentService.getById(match.request.documentId);

  return (
    <div>
      <Link href="/customer/documents" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to My Documents
      </Link>

      <div className="mt-4">
        <h1 className="font-heading text-2xl font-extrabold text-ink">Review &amp; Sign</h1>
        <p className="mt-1 text-sm text-muted">
          {match.request.documentTitle ?? "Document"} · {match.request.documentNumber}
        </p>
      </div>

      {doc?.propertyTitle && (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4 text-sm">
          <span className="font-semibold text-ink">Property: </span>
          <span className="text-muted">{doc.propertyTitle}</span>
          {doc.dealNumber && (
            <>
              {" "}
              · <span className="font-semibold text-ink">Deal: </span>
              <span className="text-muted">{doc.dealNumber}</span>
            </>
          )}
        </div>
      )}

      {doc && (
        <div className="mt-6">
          <DocumentPreviewPanel document={doc} />
        </div>
      )}

      <div className="mt-6">
        <CustomerSignatureForm participantId={participantId} documentId={match.request.documentId} disclaimer={LEGAL_DISCLAIMER} />
      </div>
    </div>
  );
}
