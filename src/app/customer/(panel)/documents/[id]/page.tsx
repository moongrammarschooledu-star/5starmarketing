import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { customerService } from "@/services/customerService";
import { documentService } from "@/services/documentService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DocumentPreviewPanel } from "@/components/admin/documents/DocumentPreviewPanel";
import { DocumentVersionHistory } from "@/components/admin/documents/DocumentVersionHistory";
import { formatDateOnly } from "@/lib/date";

export const metadata = { title: "Document" };
export const dynamic = "force-dynamic";

export default async function CustomerDocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const { id } = await params;
  const doc = await documentService.getById(id);
  if (!doc || doc.customerId !== customer.id) notFound();

  const versions = await documentService.listVersions(id);

  return (
    <div>
      <Link href="/customer/documents" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to My Documents
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{doc.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {doc.documentNumber} · {doc.documentTypeLabel ?? doc.documentType}
          </p>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      {doc.status === "REJECTED" && doc.rejectionReason && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
          <span className="font-bold">Rejected:</span> {doc.rejectionReason}. Please upload a corrected copy from{" "}
          <Link href="/customer/documents/upload" className="underline">
            My Documents
          </Link>
          .
        </div>
      )}

      <div className="mt-6 space-y-6">
        {doc.expiresAt && (
          <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
            <span className="font-semibold text-ink">Expires: </span>
            <span className="text-muted">{formatDateOnly(doc.expiresAt)}</span>
          </div>
        )}
        <DocumentPreviewPanel document={doc} />
        <DocumentVersionHistory versions={versions} />
      </div>
    </div>
  );
}
