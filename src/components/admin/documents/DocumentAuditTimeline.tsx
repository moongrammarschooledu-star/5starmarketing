import { ListChecks } from "lucide-react";
import type { DocumentAuditEntry } from "@/lib/models/document";

export function DocumentAuditTimeline({ entries }: { entries: DocumentAuditEntry[] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <ListChecks className="h-4.5 w-4.5 text-primary" /> Audit Trail
      </h2>
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No activity recorded yet.</p>
      ) : (
        <ol className="mt-4 space-y-3 border-l-2 border-border pl-4">
          {entries.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="text-sm font-semibold text-ink">{e.action}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {e.actorName ?? "System"} · {new Date(e.createdAt).toLocaleString("en-GB")}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
