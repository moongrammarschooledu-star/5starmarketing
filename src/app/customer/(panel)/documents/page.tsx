import Link from "next/link";
import { FileStack, PenLine, Upload } from "lucide-react";
import { customerService } from "@/services/customerService";
import { documentService } from "@/services/documentService";
import { documentSignatureService } from "@/services/documentSignatureService";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata = { title: "My Documents" };
export const dynamic = "force-dynamic";

export default async function CustomerDocumentsPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const [documents, pendingSignatures] = await Promise.all([documentService.listByCustomer(customer.id), documentSignatureService.listPendingForCustomer(customer.id)]);

  const agreements = documents.filter((d) => ["SALE_AGREEMENT", "RENTAL_AGREEMENT", "PROPERTY_AGREEMENT"].includes(d.documentType));
  const receipts = documents.filter((d) => ["PAYMENT_RECEIPT", "INSTALLMENT_RECEIPT", "BOOKING_RECEIPT"].includes(d.documentType));
  const others = documents.filter((d) => !agreements.includes(d) && !receipts.includes(d));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">My Documents</h1>
          <p className="mt-1 text-sm text-muted">Agreements, receipts and files linked to your account.</p>
        </div>
        <Link href="/customer/documents/upload" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <Upload className="h-4 w-4" /> Upload Document
        </Link>
      </div>

      {pendingSignatures.length > 0 && (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
            <PenLine className="h-4.5 w-4.5 text-primary" /> Awaiting Your Signature
          </h2>
          <div className="mt-3 space-y-2">
            {pendingSignatures.map(({ request, participant }) => (
              <Link key={participant.id} href={`/customer/documents/sign/${participant.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-surface p-3 text-sm hover:border-primary">
                <div>
                  <p className="font-semibold text-ink">{request.documentTitle ?? "Document"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{request.documentNumber}</p>
                </div>
                <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Review &amp; Sign</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <DocumentSection title="Agreements" documents={agreements} />
      <DocumentSection title="Receipts" documents={receipts} />
      <DocumentSection title="Other Documents" documents={others} />

      {documents.length === 0 && pendingSignatures.length === 0 && (
        <div className="mt-10 rounded-2xl border border-border bg-surface p-10 text-center">
          <FileStack className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-heading text-lg font-bold text-ink">No documents yet.</h2>
          <p className="mt-1 text-sm text-muted">Documents shared by your consultant, or that you upload, will appear here.</p>
        </div>
      )}
    </div>
  );
}

function DocumentSection({ title, documents }: { title: string; documents: Awaited<ReturnType<typeof documentService.listByCustomer>> }) {
  if (documents.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="font-heading text-base font-bold text-ink">{title}</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {documents.map((d) => (
          <Link key={d.id} href={`/customer/documents/${d.id}`} className="block rounded-2xl border border-border bg-surface p-4 hover:border-primary">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-ink">{d.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {d.documentNumber} · {d.documentTypeLabel ?? d.documentType}
                </p>
              </div>
              <StatusBadge status={d.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
