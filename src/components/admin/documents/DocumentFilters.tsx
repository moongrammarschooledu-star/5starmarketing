"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, SlidersHorizontal, X, Download, Upload } from "lucide-react";
import { documentStatuses } from "@/lib/models/document";
import type { DocumentSearchFilters } from "@/lib/models/document";
import type { DocumentType } from "@/lib/models/document";

const ALL = "";

export function DocumentFilters({ filters, types }: { filters: DocumentSearchFilters; types: DocumentType[] }) {
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

  const hasFilters = filters.status || filters.documentType || filters.dateFrom || filters.dateTo || filters.expiringOnly || filters.q;
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
            placeholder="Search by document number or title..."
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
        <select value={filters.status ?? ALL} onChange={(e) => update({ status: e.target.value || undefined })} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary">
          <option value={ALL}>All Statuses</option>
          {documentStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={filters.documentType ?? ALL} onChange={(e) => update({ type: e.target.value || undefined })} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary">
          <option value={ALL}>All Types</option>
          {types.map((t) => (
            <option key={t.code} value={t.code}>
              {t.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setShowMore((v) => !v)} className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary">
          <SlidersHorizontal className="h-4 w-4" /> More Filters
        </button>
        <a href={`/admin/documents/export?${exportParams.toString()}`} className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary">
          <Download className="h-4 w-4" /> Export
        </a>
        <Link href="/admin/documents/upload" className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <Upload className="h-4 w-4" /> Upload
        </Link>
        {hasFilters && (
          <button type="button" onClick={clearAll} className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:underline">
            <X className="h-4 w-4" /> Clear Filters
          </button>
        )}
      </form>

      {showMore && (
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Date From
            <input type="date" value={filters.dateFrom ?? ""} onChange={(e) => update({ from: e.target.value || undefined })} className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Date To
            <input type="date" value={filters.dateTo ?? ""} onChange={(e) => update({ to: e.target.value || undefined })} className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold text-muted-foreground">
            <input type="checkbox" checked={!!filters.expiringOnly} onChange={(e) => update({ expiring: e.target.checked ? "1" : undefined })} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            Expiring within 30 days
          </label>
        </div>
      )}
    </div>
  );
}
