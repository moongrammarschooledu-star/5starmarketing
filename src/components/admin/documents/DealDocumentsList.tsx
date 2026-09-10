import Link from "next/link";
import { FileText } from "lucide-react";
import type { DocumentRecord } from "@/lib/models/document";
import { StatusBadge } from "@/components/admin/StatusBadge";

export function DealDocumentsList({ documents }: { documents: DocumentRecord[] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <FileText className="h-4.5 w-4.5 text-primary" /> All Deal Documents
      </h2>
      {documents.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No documents uploaded for this deal yet.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {documents.map((d) => (
            <Link key={d.id} href={`/admin/documents/${d.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted p-3 text-sm hover:bg-primary/5">
              <div>
                <p className="font-semibold text-ink">{d.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {d.documentNumber} · {d.documentTypeLabel ?? d.documentType} · v{d.currentVersion}
                </p>
              </div>
              <StatusBadge status={d.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
