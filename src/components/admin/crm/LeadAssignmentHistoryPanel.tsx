import { History } from "lucide-react";
import type { LeadAssignmentHistoryEntry } from "@/lib/models/crm";

export function LeadAssignmentHistoryPanel({ entries }: { entries: LeadAssignmentHistoryEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <History className="h-4.5 w-4.5 text-primary" /> Assignment History
      </h2>
      <div className="mt-4 space-y-2.5">
        {entries.map((e) => (
          <div key={e.id} className="rounded-lg bg-surface-muted p-3 text-sm">
            <p className="font-semibold text-ink">
              {e.previousAgentName ?? "Unassigned"} → {e.newAgentName ?? "Unassigned"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {e.changedByName ? `By ${e.changedByName}` : "Auto-assigned"} · {new Date(e.createdAt).toLocaleString("en-GB")}
              {e.reason ? ` · ${e.reason}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
