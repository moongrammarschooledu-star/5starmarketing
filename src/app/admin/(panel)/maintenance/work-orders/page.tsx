import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { maintenanceWorkOrderService } from "@/services/maintenanceWorkOrderService";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

export default async function MaintenanceWorkOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireSection("maintenance");
  const { status } = await searchParams;
  const workOrders = await maintenanceWorkOrderService.list({ status: status as never });

  return (
    <div>
      <Link href="/admin/maintenance" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Maintenance
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Work Orders</h1>
      <p className="mt-1 text-sm text-muted">Every billable, trackable piece of maintenance work.</p>

      <form className="mt-4 flex flex-wrap gap-2" method="get">
        <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
          <option value="">All Statuses</option>
          {["NEW", "ASSIGNED", "SCHEDULED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "VERIFICATION", "CLOSED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
          Filter
        </button>
        {status && (
          <Link href="/admin/maintenance/work-orders" className="flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-muted hover:text-primary">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">WO #</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Vendor / Technician</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Est. Cost</th>
              <th className="px-4 py-3">Scheduled</th>
            </tr>
          </thead>
          <tbody>
            {workOrders.map((w) => (
              <tr key={w.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/maintenance/work-orders/${w.id}`} className="font-semibold text-primary hover:underline">
                    {w.workOrderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink">{w.propertyTitle ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{w.vendorName ?? w.technicianName ?? "Unassigned"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={w.priority} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={w.status} />
                </td>
                <td className="px-4 py-3 text-muted">{w.estimatedCost != null ? formatPKR(w.estimatedCost) : "—"}</td>
                <td className="px-4 py-3 text-muted">{w.scheduledDate ? new Date(w.scheduledDate).toLocaleDateString("en-GB") : "—"}</td>
              </tr>
            ))}
            {workOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  No work orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
