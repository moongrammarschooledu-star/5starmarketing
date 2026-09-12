"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import type { TransactionSearchFilters } from "@/lib/models/accounting";
import { transactionTypes, transactionStatuses } from "@/lib/models/accounting";

export function TransactionFilters({ filters }: { filters: TransactionSearchFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(filters.q ?? "");
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

  const hasFilters = filters.transactionType || filters.status || filters.q || filters.dateFrom || filters.dateTo;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by number, description, reference..." className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-primary" />
        </div>
        <select value={filters.transactionType ?? ""} onChange={(e) => update({ type: e.target.value || undefined })} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary">
          <option value="">All Types</option>
          {transactionTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={filters.status ?? ""} onChange={(e) => update({ status: e.target.value || undefined })} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary">
          <option value="">All Statuses</option>
          {transactionStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input type="date" value={filters.dateFrom ?? ""} onChange={(e) => update({ from: e.target.value || undefined })} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        <input type="date" value={filters.dateTo ?? ""} onChange={(e) => update({ to: e.target.value || undefined })} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        {hasFilters && (
          <button type="button" onClick={() => router.push(pathname, { scroll: false })} className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:underline">
            <X className="h-4 w-4" /> Clear
          </button>
        )}
      </form>
    </div>
  );
}
