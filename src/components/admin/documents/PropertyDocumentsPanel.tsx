import Link from "next/link";
import { FileStack, Plus } from "lucide-react";
import type { DocumentRecord, DocumentType } from "@/lib/models/document";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DocumentUploadForm } from "@/components/admin/documents/DocumentUploadForm";
import { formatDateOnly } from "@/lib/date";

/** The papers every property file should have; the panel shows which are still missing. */
const EXPECTED = ["FARD", "REGISTRY", "OWNER_CNIC", "INTIQAL"];

function daysLeft(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

/** All the papers of one property (Fard, registry, owner CNIC ...): see them and add more right here. */
export function PropertyDocumentsPanel({ propertyId, documents, types, canUpload }: { propertyId: string; documents: DocumentRecord[]; types: DocumentType[]; canUpload: boolean }) {
  const have = new Set(documents.map((d) => d.documentType));
  const missing = types.filter((t) => EXPECTED.includes(t.code) && !have.has(t.code));

  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <FileStack className="h-3.5 w-3.5" /> Property Documents (admin-only — never shown publicly)
        </h2>
        {canUpload && (
          <Link href={`/admin/documents/upload?property=${propertyId}`} className="text-xs font-semibold text-primary hover:underline">
            Open full upload page
          </Link>
        )}
      </div>

      {documents.length > 0 ? (
        <div className="mt-2.5 space-y-1.5">
          {documents.map((d) => {
            const left = d.expiresAt ? daysLeft(d.expiresAt) : null;
            return (
              <Link key={d.id} href={`/admin/documents/${d.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm hover:bg-surface-muted/70">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{d.title}</span>
                  <span className="block truncate text-xs text-muted">
                    {d.documentTypeLabel ?? d.documentType}
                    {d.expiresAt && left !== null ? (
                      <span className={left <= 30 ? "ml-2 font-semibold text-primary" : "ml-2"}>
                        {left < 0 ? `expired ${formatDateOnly(d.expiresAt)}` : `expires ${formatDateOnly(d.expiresAt)} (${left} days)`}
                      </span>
                    ) : null}
                  </span>
                </span>
                <StatusBadge status={d.status} />
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="mt-2.5 text-sm text-muted">No documents yet for this property.</p>
      )}

      {missing.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          Still to add: {missing.map((t) => t.label).join(", ")}
        </p>
      )}

      {canUpload && (
        <details className="mt-3 group">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover">
            <Plus className="h-3.5 w-3.5" /> Add documents
          </summary>
          <div className="mt-3">
            <DocumentUploadForm types={types} deals={[]} properties={[]} projects={[]} defaultPropertyId={propertyId} />
          </div>
        </details>
      )}
    </div>
  );
}
