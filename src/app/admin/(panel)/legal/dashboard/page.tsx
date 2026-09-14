import { legalReportService } from "@/services/legalReportService";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function LegalDashboardPage() {
  await requireSection("legal");
  const today = new Date();
  const in60 = new Date();
  in60.setDate(in60.getDate() + 60);
  const [stats, calendar] = await Promise.all([
    legalReportService.dashboardStats(),
    legalReportService.calendar(today.toISOString().slice(0, 10), in60.toISOString().slice(0, 10)),
  ]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Legal Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Real counts only — nothing here is a legal opinion or government clearance.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Properties w/ Legal Record" value={stats.totalPropertiesWithLegalRecords} />
        <Stat label="Ownership Incomplete" value={stats.ownershipAllocationsIncomplete} accent={stats.ownershipAllocationsIncomplete > 0} />
        <Stat label="Documents Expiring Soon" value={stats.documentsExpiringSoon} accent={stats.documentsExpiringSoon > 0} />
        <Stat label="Documents Expired" value={stats.documentsExpired} accent={stats.documentsExpired > 0} />
        <Stat label="Documents Unverified" value={stats.documentsUnverified} />
        <Stat label="Open Due-Diligence" value={stats.openDueDiligenceCases} />
        <Stat label="Due-Diligence Overdue" value={stats.dueDiligenceOverdue} accent={stats.dueDiligenceOverdue > 0} />
        <Stat label="Active Encumbrances" value={stats.activeEncumbrances} accent={stats.activeEncumbrances > 0} />
        <Stat label="Open Legal Cases" value={stats.openLegalCases} />
        <Stat label="Upcoming Hearings (30d)" value={stats.upcomingHearings} />
        <Stat label="Open Risks" value={stats.openLegalRisks} />
        <Stat label="Critical Risks" value={stats.criticalLegalRisks} accent={stats.criticalLegalRisks > 0} />
        <Stat label="Pending Approvals" value={stats.pendingLegalApprovals} />
        <Stat label="Non-Compliant Properties" value={stats.nonCompliantProperties} accent={stats.nonCompliantProperties > 0} />
        <Stat label="Contracts Expiring Soon" value={stats.contractsExpiringSoon} />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Legal Calendar — Next 60 Days</h2>
        <p className="mt-1 text-xs text-muted">Assembled live from real records — never a fabricated event.</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {calendar.slice(0, 50).map((entry, i) => (
                <tr key={`${entry.entityId}-${i}`} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                  <td className="px-4 py-3 font-semibold text-ink">{entry.date}</td>
                  <td className="px-4 py-3 text-muted">{entry.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-muted">{entry.label}</td>
                </tr>
              ))}
              {calendar.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm text-muted">
                    Nothing scheduled in the next 60 days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-lg font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}
