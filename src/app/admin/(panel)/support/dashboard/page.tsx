import { supportReportService } from "@/services/supportReportService";
import { requireSection } from "@/lib/guard";
import { SlaSweepButton } from "@/components/support/SlaSweepButton";

export const dynamic = "force-dynamic";

export default async function SupportDashboardPage() {
  await requireSection("support");
  const [stats, byDepartment, byPriority, byCategory, byStaff, byDeptPerf, bySource, volume] = await Promise.all([
    supportReportService.dashboardStats(),
    supportReportService.byDepartment(),
    supportReportService.byPriority(),
    supportReportService.byCategory(),
    supportReportService.staffPerformance(),
    supportReportService.departmentPerformance(),
    supportReportService.bySource(),
    supportReportService.volumeTrend(30),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Support Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Real counts only — nothing here is estimated or fabricated.</p>
        </div>
        <SlaSweepButton />
      </div>
      <p className="mt-1 text-xs text-muted">No background job runner exists in this codebase — SLA breach detection runs manually via the button above rather than on a real schedule.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Total Tickets" value={stats.totalTickets} />
        <Stat label="Open" value={stats.openTickets} />
        <Stat label="New Today" value={stats.newTicketsToday} />
        <Stat label="Pending" value={stats.pendingTickets} />
        <Stat label="In Progress" value={stats.inProgressTickets} />
        <Stat label="Resolved" value={stats.resolvedTickets} />
        <Stat label="Closed" value={stats.closedTickets} />
        <Stat label="Reopened" value={stats.reopenedTickets} accent={stats.reopenedTickets > 0} />
        <Stat label="Escalated" value={stats.escalatedTickets} accent={stats.escalatedTickets > 0} />
        <Stat label="Complaints" value={stats.complaints} accent={stats.complaints > 0} />
        <Stat label="High Priority" value={stats.highPriorityTickets} accent={stats.highPriorityTickets > 0} />
        <Stat label="Overdue SLA" value={stats.overdueSlaTickets} accent={stats.overdueSlaTickets > 0} />
        <Stat label="Avg First Response (min)" value={stats.averageFirstResponseMinutes ?? "N/A"} />
        <Stat label="Avg Resolution (min)" value={stats.averageResolutionMinutes ?? "N/A"} />
        <Stat label="Avg CSAT" value={stats.averageCsat ?? "N/A"} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Breakdown title="Tickets by Department" rows={byDepartment} />
        <Breakdown title="Tickets by Priority" rows={byPriority} />
        <Breakdown title="Tickets by Category" rows={byCategory} />
        <Breakdown title="Tickets by Source" rows={bySource} />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Ticket Volume — Last 30 Days</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-end gap-1" style={{ height: 120 }}>
            {volume.map((v) => {
              const max = Math.max(...volume.map((x) => x.count), 1);
              return <div key={v.label} title={`${v.label}: ${v.count}`} className="w-3 rounded-t bg-primary/70" style={{ height: `${Math.max(4, (v.count / max) * 100)}%` }} />;
            })}
            {volume.length === 0 && <p className="text-sm text-muted">No tickets in the last 30 days.</p>}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-heading text-lg font-bold text-ink">Staff Performance</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Open</th>
                  <th className="px-4 py-3">Resolved</th>
                  <th className="px-4 py-3">Avg CSAT</th>
                </tr>
              </thead>
              <tbody>
                {byStaff.map((s) => (
                  <tr key={s.staffId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold text-ink">{s.staffName}</td>
                    <td className="px-4 py-3 text-muted">{s.openTickets}</td>
                    <td className="px-4 py-3 text-muted">{s.resolvedTickets}</td>
                    <td className="px-4 py-3 text-muted">{s.averageCsat ?? "N/A"}</td>
                  </tr>
                ))}
                {byStaff.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted">
                      No assigned tickets yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="font-heading text-lg font-bold text-ink">Department Performance</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Open</th>
                  <th className="px-4 py-3">Resolved</th>
                  <th className="px-4 py-3">SLA Breaches</th>
                </tr>
              </thead>
              <tbody>
                {byDeptPerf.map((d) => (
                  <tr key={d.departmentId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold text-ink">{d.departmentName}</td>
                    <td className="px-4 py-3 text-muted">{d.openTickets}</td>
                    <td className="px-4 py-3 text-muted">{d.resolvedTickets}</td>
                    <td className={`px-4 py-3 ${d.slaBreaches > 0 ? "font-bold text-primary" : "text-muted"}`}>{d.slaBreaches}</td>
                  </tr>
                ))}
                {byDeptPerf.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted">
                      No department-assigned tickets yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-lg font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className="w-32 shrink-0 truncate text-xs text-muted">{r.label}</span>
            <div className="h-2 flex-1 rounded-full bg-surface-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-bold text-ink">{r.count}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-muted">No data yet.</p>}
      </div>
    </div>
  );
}
