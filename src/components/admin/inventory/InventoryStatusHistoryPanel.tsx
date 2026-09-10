import { History } from "lucide-react";
import type { InventoryStatusHistoryEntry } from "@/lib/models/inventory";

export function InventoryStatusHistoryPanel({ history }: { history: InventoryStatusHistoryEntry[] }) {
  if (history.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <History className="h-4.5 w-4.5 text-primary" /> Status History
      </h2>
      <div className="mt-4 space-y-2.5">
        {history.map((h) => (
          <div key={h.id} className="rounded-lg bg-surface-muted p-3 text-sm">
            <p className="font-semibold text-ink">
              {h.previousStatus ?? "—"} → {h.newStatus}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {h.changedByName ? `By ${h.changedByName}` : "System"} · {new Date(h.createdAt).toLocaleString("en-GB")}
              {h.reason ? ` · ${h.reason}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
