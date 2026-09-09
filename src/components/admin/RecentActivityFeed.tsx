import { Activity } from "lucide-react";
import type { ActivityLogEntry } from "@/lib/models/analytics";

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecentActivityFeed({ entries }: { entries: ActivityLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No activity yet.</p>;
  }

  return (
    <div className="space-y-2.5">
      {entries.map((e) => (
        <div key={e.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Activity className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-ink">{e.action}</div>
            <div className="truncate text-xs text-muted">{e.description}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {e.adminName} · {formatTimestamp(e.createdAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
