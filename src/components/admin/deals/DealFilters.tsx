"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, Download, Plus } from "lucide-react";
import Link from "next/link";
import { allDealStatuses, dealTypes, commissionStatuses } from "@/lib/models/deal";
import type { DealSearchFilters } from "@/lib/models/deal";

const ALL = "";

export function DealFilters({ filters, agents }: { filters: DealSearchFilters; agents: { id: string; name: string }[] }) {
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
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    update({ q: q.trim() || undefined });
  }

  function clearAll() {
    setQ("");
    startTransition(() => router.push(pathname, { scroll: false }));
  }

  const hasFilters = filters.status || filters.dealType || filters.agentId || filters.commissionStatus || filters.paymentStatus || filters.dateFrom || filters.dateTo || filters.q;
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
            placeholder="Search by deal number, customer, phone or property..."
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
        <select
          value={filters.status ?? ALL}
          onChange={(e) => update({ status: e.target.value || undefined })}
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary"
        >
          <option value={ALL}>All Statuses</option>
          {allDealStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filters.sort ?? "newest"}
          onChange={(e) => update({ sort: e.target.value === "newest" ? undefined : e.target.value })}
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="value_desc">Highest Deal Value</option>
          <option value="value_asc">Lowest Deal Value</option>
        </select>
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
        >
          <SlidersHorizontal className="h-4 w-4" /> More Filters
        </button>
        <a
          href={`/admin/deals/export?${exportParams.toString()}`}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
        >
          <Download className="h-4 w-4" /> Export CSV
        </a>
        <Link
          href="/admin/deals/new"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" /> New Deal
        </Link>
        {hasFilters && (
          <button type="button" onClick={clearAll} className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:underline">
            <X className="h-4 w-4" /> Clear Filters
          </button>
        )}
      </form>

      {showMore && (
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-3 lg:grid-cols-5">
          <Select label="Deal Type" value={filters.dealType ?? ALL} onChange={(v) => update({ type: v })} options={dealTypes} />
          <Select label="Commission Status" value={filters.commissionStatus ?? ALL} onChange={(v) => update({ commission: v })} options={commissionStatuses} />
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Payment Status
            <select
              value={filters.paymentStatus ?? ALL}
              onChange={(e) => update({ payment: e.target.value || undefined })}
              className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-medium text-ink outline-none focus:border-primary"
            >
              <option value={ALL}>All</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partially Paid</option>
              <option value="paid">Fully Paid</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Agent
            <select
              value={filters.agentId ?? ALL}
              onChange={(e) => update({ agent: e.target.value || undefined })}
              className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-medium text-ink outline-none focus:border-primary"
            >
              <option value={ALL}>All Agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
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

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string | undefined) => void; options: readonly string[] }) {
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
