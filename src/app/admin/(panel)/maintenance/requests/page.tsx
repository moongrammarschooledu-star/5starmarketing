import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { maintenanceRequestService } from "@/services/maintenanceRequestService";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function MaintenanceRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string; priority?: string; q?: string }> }) {
  await requireSection("maintenance");
  const { status, priority, q } = await searchParams;
  const requests = await maintenanceRequestService.list({
    status: status as never,
    priority,
    q,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/maintenance" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to Maintenance
          </Link>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Maintenance Requests</h1>
        </div>
        <Link href="/admin/maintenance/requests/new" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
          <Plus className="h-4 w-4" /> New Request
        </Link>
      </div>

      <form className="mt-4 flex flex-wrap gap-2" method="get">
        <input type="text" name="q" defaultValue={q} placeholder="Search request # or description..." className="min-w-[220px] flex-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
          <option value="">All Statuses</option>
          {["NEW", "ACKNOWLEDGED", "ASSIGNED", "SCHEDULED", "IN_PROGRESS", "WAITING_FOR_PARTS", "WAITING_FOR_CUSTOMER", "COMPLETED", "VERIFICATION_REQUIRED", "CLOSED", "REJECTED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select name="priority" defaultValue={priority ?? ""} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
          <option value="">All Priorities</option>
          {["LOW", "NORMAL", "HIGH", "URGENT", "EMERGENCY"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
          Filter
        </button>
        {(status || priority || q) && (
          <Link href="/admin/maintenance/requests" className="flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-muted hover:text-primary">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Request #</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">SLA</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/maintenance/requests/${r.id}`} className="font-semibold text-primary hover:underline">
                    {r.requestNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink">{r.propertyTitle ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{r.category}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.priority} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3">
                  {(r.slaResponseBreached || r.slaResolutionBreached) && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">SLA Breached</span>}
                </td>
                <td className="px-4 py-3 text-muted">{new Date(r.createdAt).toLocaleDateString("en-GB")}</td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  No maintenance requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
