import { supportReportService } from "@/services/supportReportService";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function SupportStaffPage() {
  await requireSection("support");
  const staff = await supportReportService.staffPerformance();

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Staff Performance</h1>
      <p className="mt-1 text-sm text-muted">Computed live from real ticket assignments — never estimated.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Open Tickets</th>
              <th className="px-4 py-3">Resolved Tickets</th>
              <th className="px-4 py-3">Avg Resolution (min)</th>
              <th className="px-4 py-3">Avg CSAT</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.staffId} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">{s.staffName}</td>
                <td className="px-4 py-3 text-muted">{s.openTickets}</td>
                <td className="px-4 py-3 text-muted">{s.resolvedTickets}</td>
                <td className="px-4 py-3 text-muted">{s.averageResolutionMinutes ?? "N/A"}</td>
                <td className="px-4 py-3 text-muted">{s.averageCsat ?? "N/A"}</td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                  No assigned tickets yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
