import Link from "next/link";
import type { Deal } from "@/lib/models/deal";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CrmPaginationLinks } from "@/components/admin/crm/CrmPaginationLinks";
import { formatPKR } from "@/lib/calculator";

export function DealsTable({ deals, total, page, totalPages, pageSize }: { deals: Deal[]; total: number; page: number; totalPages: number; pageSize: number }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted">
        Showing {deals.length === 0 ? 0 : (page - 1) * pageSize + 1}
        {"–"}
        {(page - 1) * pageSize + deals.length} of {total} deals
      </p>

      <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-border bg-surface lg:block">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Deal #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Deal Value</th>
              <th className="px-4 py-3">Outstanding</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {deals.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted">
                  No deals match those filters.
                </td>
              </tr>
            )}
            {deals.map((d) => (
              <tr key={d.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                <td className="px-4 py-3 font-semibold text-ink">
                  <Link href={`/admin/deals/${d.id}`} className="hover:text-primary">
                    {d.dealNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{d.customerName ?? "—"}</td>
                <td className="max-w-[180px] px-4 py-3 text-muted">
                  <span className="line-clamp-1">{d.propertyTitle ?? d.projectName ?? "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-bold text-ink">{d.dealType}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={d.status} />
                </td>
                <td className="px-4 py-3 font-semibold text-ink">{formatPKR(d.finalAmount)}</td>
                <td className="px-4 py-3 text-muted">{d.outstandingAmount > 0 ? formatPKR(d.outstandingAmount) : <span className="text-success font-semibold">Settled</span>}</td>
                <td className="px-4 py-3 text-xs text-muted">{d.agentName ?? "Unassigned"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{new Date(d.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-3 lg:hidden">
        {deals.length === 0 && <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">No deals match those filters.</p>}
        {deals.map((d) => (
          <Link key={d.id} href={`/admin/deals/${d.id}`} className="block rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-ink">{d.dealNumber}</div>
                <div className="mt-0.5 text-xs text-muted">{d.customerName ?? "No customer linked"}</div>
              </div>
              <StatusBadge status={d.status} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="font-semibold text-ink">{formatPKR(d.finalAmount)}</span>
              <span className="rounded-full bg-ink/5 px-2 py-0.5 font-bold text-ink">{d.dealType}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{d.agentName ?? "Unassigned"}</span>
              <span>{new Date(d.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </div>
          </Link>
        ))}
      </div>

      <CrmPaginationLinks page={page} totalPages={totalPages} />
    </div>
  );
}
