"use client";

import { useRouter, usePathname } from "next/navigation";
import clsx from "clsx";
import { followUpStatuses } from "@/lib/models/team";

const RANGES: { key: "today" | "tomorrow" | "week" | "overdue" | ""; label: string }[] = [
  { key: "", label: "All" },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "week", label: "This Week" },
  { key: "overdue", label: "Overdue" },
];

export function FollowUpCenterFilters({
  agents,
  currentRange,
  currentAgent,
  currentStatus,
}: {
  agents: { id: string; name: string }[];
  currentRange?: string;
  currentAgent?: string;
  currentStatus?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function update(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const next = { range: currentRange, agent: currentAgent, status: currentStatus, ...patch };
    if (next.range) params.set("range", next.range);
    if (next.agent) params.set("agent", next.agent);
    if (next.status) params.set("status", next.status);
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-1.5 rounded-full border border-border bg-surface p-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => update({ range: r.key || undefined })}
            className={clsx(
              "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
              (currentRange ?? "") === r.key ? "bg-primary text-primary-foreground" : "text-muted hover:text-ink"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <select
        value={currentAgent ?? ""}
        onChange={(e) => update({ agent: e.target.value || undefined })}
        className="rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-bold text-ink outline-none focus:border-primary"
      >
        <option value="">All Agents</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      <select
        value={currentStatus ?? ""}
        onChange={(e) => update({ status: e.target.value || undefined })}
        className="rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-bold text-ink outline-none focus:border-primary"
      >
        <option value="">All Statuses</option>
        {followUpStatuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
