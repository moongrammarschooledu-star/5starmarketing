import Link from "next/link";
import { CheckCircle2, Circle, XCircle } from "lucide-react";
import type { DealChecklistProgress } from "@/lib/models/document";
import { StatusBadge } from "@/components/admin/StatusBadge";

export function DealChecklistProgressPanel({ progress }: { progress: DealChecklistProgress }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-base font-bold text-ink">Document Checklist</h2>
        <span className="text-sm font-bold text-ink">
          {progress.completedRequired}/{progress.totalRequired} Required Completed
        </span>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-success transition-all" style={{ width: `${progress.percent}%` }} />
      </div>

      {progress.items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No checklist items apply to this deal&apos;s type.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {progress.items.map(({ item, document }) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted p-3 text-sm">
              <div className="flex items-center gap-2.5">
                {document?.status === "APPROVED" ? (
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-success" />
                ) : document ? (
                  <Circle className="h-4.5 w-4.5 shrink-0 text-amber-500" />
                ) : item.required ? (
                  <XCircle className="h-4.5 w-4.5 shrink-0 text-primary" />
                ) : (
                  <Circle className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <p className="font-semibold text-ink">
                    {item.documentTypeLabel ?? item.documentType} {item.required && <span className="text-[10px] font-bold uppercase text-primary">Required</span>}
                  </p>
                </div>
              </div>
              {document ? (
                <Link href={`/admin/documents/${document.id}`} className="flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                  <StatusBadge status={document.status} />
                </Link>
              ) : (
                <span className="text-xs font-semibold text-muted">Missing</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
