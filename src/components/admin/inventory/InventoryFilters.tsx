"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, SlidersHorizontal, X, Download, Plus, Upload } from "lucide-react";
import { inventoryStatuses, inventoryUnitTypes } from "@/lib/models/inventory";
import type { InventorySearchFilters } from "@/lib/models/inventory";

const ALL = "";

export function InventoryFilters({ filters, projects }: { filters: InventorySearchFilters; projects: { id: string; name: string }[] }) {
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

  const hasFilters = filters.projectId || filters.unitType || filters.block || filters.building || filters.status || filters.minPrice || filters.maxPrice || filters.q;
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
            placeholder="Search by unit number..."
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
        <select
          value={filters.status ?? ALL}
          onChange={(e) => update({ status: e.target.value || undefined })}
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary"
        >
          <option value={ALL}>All Statuses</option>
          {inventoryStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filters.projectId ?? ALL}
          onChange={(e) => update({ project: e.target.value || undefined })}
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary"
        >
          <option value={ALL}>All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
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
        <a href={`/admin/inventory/export?${exportParams.toString()}`} className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary">
          <Download className="h-4 w-4" /> Export
        </a>
        <Link href="/admin/inventory/import" className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary">
          <Upload className="h-4 w-4" /> Bulk Import
        </Link>
        <Link href="/admin/inventory/new" className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <Plus className="h-4 w-4" /> New Unit
        </Link>
        {hasFilters && (
          <button type="button" onClick={clearAll} className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:underline">
            <X className="h-4 w-4" /> Clear Filters
          </button>
        )}
      </form>

      {showMore && (
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-3 lg:grid-cols-6">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Type
            <select value={filters.unitType ?? ALL} onChange={(e) => update({ type: e.target.value || undefined })} className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-medium text-ink outline-none focus:border-primary">
              <option value={ALL}>All</option>
              {inventoryUnitTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Block
            <input type="text" value={filters.block ?? ""} onChange={(e) => update({ block: e.target.value || undefined })} className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Building
            <input type="text" value={filters.building ?? ""} onChange={(e) => update({ building: e.target.value || undefined })} className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Min Price
            <input type="number" min={0} value={filters.minPrice ?? ""} onChange={(e) => update({ min_price: e.target.value || undefined })} className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Max Price
            <input type="number" min={0} value={filters.maxPrice ?? ""} onChange={(e) => update({ max_price: e.target.value || undefined })} className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            Sort
            <select value={filters.sort ?? "newest"} onChange={(e) => update({ sort: e.target.value === "newest" ? undefined : e.target.value })} className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-medium text-ink outline-none focus:border-primary">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="price_asc">Price Low → High</option>
              <option value="price_desc">Price High → Low</option>
              <option value="size_asc">Size Small → Large</option>
              <option value="size_desc">Size Large → Small</option>
              <option value="unit_number">Unit Number</option>
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
