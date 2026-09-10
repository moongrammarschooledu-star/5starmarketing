"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, Download } from "lucide-react";
import { leadStatuses, leadPriorities, leadSources, leadTypes, leadPurposes } from "@/lib/models/lead";
import type { LeadSearchFilters } from "@/lib/models/crm";

const ALL = "";

export function CrmLeadFilters({
  filters,
  agents,
}: {
  filters: LeadSearchFilters;
  agents: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(filters.q ?? "");
  const [showMore, setShowMore] = useState(false);
  const [, startTransition] = useTransition();

  function update(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    update({ q: q.trim() || undefined });
  }

  function clearAll() {
    setQ("");
    startTransition(() => router.push(pathname, { scroll: false }));
  }

  const hasFilters =
    filters.status || filters.priority || filters.source || filters.leadType || filters.purpose || filters.agentId || filters.unassigned || filters.followUpDue || filters.dateFrom || filters.dateTo || filters.q;

  const exportParams = new URLSearchParams(searchParams.toString());
  exportParams.delete("page");

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, phone, email, lead ID or property..."
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
        <select
          value={filters.status ?? ALL}
          onChange={(e) => update({ status: e.target.value || undefined })}
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary"
        >
          <option value={ALL}>All Statuses</option>
          {leadStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
        >
          <SlidersHorizontal className="h-4 w-4" /> More Filters
        </button>
        <a
          href={`/admin/crm/leads/export?${exportParams.toString()}`}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
        >
          <Download className="h-4 w-4" /> Export CSV
        </a>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:underline"
          >
            <X className="h-4 w-4" /> Clear Filters
          </button>
        )}
      </form>

      {showMore && (
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-3 lg:grid-cols-5">
          <Select label="Priority" value={filters.priority ?? ALL} onChange={(v) => update({ priority: v })} options={leadPriorities} />
          <Select label="Source" value={filters.source ?? ALL} onChange={(v) => update({ source: v })} options={leadSources} />
          <Select label="Lead Type" value={filters.leadType ?? ALL} onChange={(v) => update({ type: v })} options={leadTypes} />
          <Select label="Purpose" value={filters.purpose ?? ALL} onChange={(v) => update({ purpose: v })} options={leadPurposes} />
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Agent
            <select
              value={filters.unassigned ? "unassigned" : filters.agentId ?? ALL}
              onChange={(e) => {
                if (e.target.value === "unassigned") update({ agent: undefined, unassigned: "1" });
                else update({ agent: e.target.value || undefined, unassigned: undefined });
              }}
              className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-medium text-ink outline-none focus:border-primary"
            >
              <option value={ALL}>All Agents</option>
              <option value="unassigned">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Follow-Up Due
            <select
              value={filters.followUpDue ?? ALL}
              onChange={(e) => update({ follow_up: e.target.value || undefined })}
              className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-medium text-ink outline-none focus:border-primary"
            >
              <option value={ALL}>Any</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="none">Not Scheduled</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Date From
            <input
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) => update({ from: e.target.value || undefined })}
              className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Date To
            <input
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) => update({ to: e.target.value || undefined })}
              className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string | undefined) => void;
  options: readonly string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-medium text-ink outline-none focus:border-primary"
      >
        <option value={ALL}>All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
