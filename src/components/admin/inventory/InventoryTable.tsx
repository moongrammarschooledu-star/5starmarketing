"use client";

import { useState } from "react";
import Link from "next/link";
import type { InventoryUnit, InventoryStatus } from "@/lib/models/inventory";
import { inventoryStatuses } from "@/lib/models/inventory";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CrmPaginationLinks } from "@/components/admin/crm/CrmPaginationLinks";
import { formatPKR } from "@/lib/calculator";
import { bulkUpdateInventoryStatusAction } from "@/lib/actions/inventory.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { useRouter } from "next/navigation";

export function InventoryTable({ units, total, page, totalPages, pageSize, canBulkUpdate }: { units: InventoryUnit[]; total: number; page: number; totalPages: number; pageSize: number; canBulkUpdate: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<InventoryStatus>("BLOCKED");
  const [isPending, setIsPending] = useState(false);
  const toast = useToast();
  const router = useRouter();

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((s) => (s.size === units.length ? new Set() : new Set(units.map((u) => u.id))));
  }

  async function applyBulk() {
    if (selected.size === 0) return;
    if (!confirm(`Change ${selected.size} unit(s) to ${bulkStatus}?`)) return;
    setIsPending(true);
    try {
      const result = await bulkUpdateInventoryStatusAction([...selected], bulkStatus);
      toast.show(`${result.succeeded.length} updated${result.failed.length ? `, ${result.failed.length} failed` : ""}.`);
      setSelected(new Set());
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted">
          Showing {units.length === 0 ? 0 : (page - 1) * pageSize + 1}–{(page - 1) * pageSize + units.length} of {total} units
        </p>
        {canBulkUpdate && selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted">{selected.size} selected</span>
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as InventoryStatus)} className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink outline-none focus:border-primary">
              {inventoryStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button type="button" onClick={applyBulk} disabled={isPending} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
              Apply
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-border bg-surface lg:block">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {canBulkUpdate && (
                <th className="px-4 py-3">
                  <input type="checkbox" checked={units.length > 0 && selected.size === units.length} onChange={toggleAll} />
                </th>
              )}
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Project / Property</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Agent</th>
            </tr>
          </thead>
          <tbody>
            {units.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  No inventory matches those filters.
                </td>
              </tr>
            )}
            {units.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                {canBulkUpdate && (
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
                  </td>
                )}
                <td className="px-4 py-3 font-semibold text-ink">
                  <Link href={`/admin/inventory/${u.id}`} className="hover:text-primary">
                    {u.unitNumber}
                  </Link>
                  {(u.block || u.building || u.floor) && (
                    <div className="text-xs font-normal text-muted-foreground">{[u.building, u.block, u.floor && `Floor ${u.floor}`].filter(Boolean).join(" · ")}</div>
                  )}
                </td>
                <td className="max-w-[160px] px-4 py-3 text-muted">
                  <span className="line-clamp-1">{u.projectName ?? u.propertyTitle ?? "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-bold text-ink">{u.unitType}</span>
                </td>
                <td className="px-4 py-3 text-muted">{u.area ? `${u.area} ${u.areaUnit ?? ""}` : "—"}</td>
                <td className="px-4 py-3 font-semibold text-ink">{u.price ? formatPKR(u.price) : "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={u.status} />
                </td>
                <td className="px-4 py-3 text-xs text-muted">{u.agentName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-3 lg:hidden">
        {units.length === 0 && <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">No inventory matches those filters.</p>}
        {units.map((u) => (
          <Link key={u.id} href={`/admin/inventory/${u.id}`} className="block rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-ink">{u.unitNumber}</div>
                <div className="mt-0.5 text-xs text-muted">{u.projectName ?? u.propertyTitle ?? "—"}</div>
              </div>
              <StatusBadge status={u.status} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="font-semibold text-ink">{u.price ? formatPKR(u.price) : "—"}</span>
              <span className="rounded-full bg-ink/5 px-2 py-0.5 font-bold text-ink">{u.unitType}</span>
            </div>
          </Link>
        ))}
      </div>

      <CrmPaginationLinks page={page} totalPages={totalPages} />
    </div>
  );
}
