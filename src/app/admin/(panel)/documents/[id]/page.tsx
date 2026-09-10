import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User, Building2, Handshake } from "lucide-react";
import { documentService } from "@/services/documentService";
import { documentSignatureService } from "@/services/documentSignatureService";
import { profileService } from "@/services/profileService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DocumentPreviewPanel } from "@/components/admin/documents/DocumentPreviewPanel";
import { DocumentStatusActionsPanel } from "@/components/admin/documents/DocumentStatusActionsPanel";
import { DocumentVersionHistory } from "@/components/admin/documents/DocumentVersionHistory";
import { DocumentAuditTimeline } from "@/components/admin/documents/DocumentAuditTimeline";
import { DocumentSignaturePanel } from "@/components/admin/documents/DocumentSignaturePanel";
import { formatDateOnly } from "@/lib/date";
import { canManageDealFinancials } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("documents");
  const { id } = await params;
  const doc = await documentService.getById(id);
  if (!doc) notFound();

  const [versions, audit, signatureRequests, admin] = await Promise.all([
    documentService.listVersions(id),
    documentService.listAuditLog(id),
    documentSignatureService.listByDocument(id),
    profileService.getCurrentAdmin(),
  ]);
  const canManage = admin ? canManageDealFinancials(admin.role) : false;

  return (
    <div>
      <Link href="/admin/documents" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Documents
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{doc.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {doc.documentNumber} · {doc.documentTypeLabel ?? doc.documentType} · v{doc.currentVersion}
          </p>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {doc.customerName && <Row icon={<User className="h-4 w-4 text-primary" />} label="Customer" value={doc.customerName} />}
              {doc.propertyTitle && <Row icon={<Building2 className="h-4 w-4 text-primary" />} label="Property" value={doc.propertyTitle} />}
              {doc.projectName && <Row icon={<Building2 className="h-4 w-4 text-primary" />} label="Project" value={doc.projectName} />}
              {doc.dealNumber && doc.dealId && (
                <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Deal</span>
                  <Link href={`/admin/deals/${doc.dealId}`} className="flex items-center gap-1 text-right font-semibold text-primary hover:underline">
                    <Handshake className="h-3.5 w-3.5" /> {doc.dealNumber}
                  </Link>
                </div>
              )}
              <Row label="Uploaded By" value={doc.uploadedByName ?? (doc.uploadedByCustomer ? "Customer" : "—")} />
              <Row label="Created" value={new Date(doc.createdAt).toLocaleString("en-GB")} />
              {doc.expiresAt && <Row label="Expires" value={formatDateOnly(doc.expiresAt)} />}
              {doc.verifiedByName && <Row label="Verified By" value={doc.verifiedByName} />}
              {doc.approvedByName && <Row label="Approved By" value={doc.approvedByName} />}
              <Row label="Visibility" value={doc.visibility} />
            </div>
            {doc.description && <p className="mt-4 whitespace-pre-line rounded-lg bg-surface-muted p-3.5 text-sm text-ink">{doc.description}</p>}
          </div>

          <DocumentPreviewPanel document={doc} />
          <DocumentSignaturePanel document={doc} requests={signatureRequests} customerName={doc.customerName} customerId={doc.customerId} />
          <DocumentVersionHistory versions={versions} />
          <DocumentAuditTimeline entries={audit} />
        </div>

        <div>
          <DocumentStatusActionsPanel document={doc} canManage={canManage} />
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}
