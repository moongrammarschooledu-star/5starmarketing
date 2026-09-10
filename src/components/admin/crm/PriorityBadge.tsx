import clsx from "clsx";
import type { LeadPriority } from "@/lib/models/lead";

const palette: Record<LeadPriority, string> = {
  Low: "bg-muted/20 text-muted",
  Medium: "bg-ink/10 text-ink",
  High: "bg-amber-500/10 text-amber-600",
  Urgent: "bg-primary/15 text-primary",
};

export function PriorityBadge({ priority }: { priority: LeadPriority }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold", palette[priority])}>
      {priority}
    </span>
  );
}
