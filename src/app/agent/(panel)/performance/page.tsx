import { profileService } from "@/services/profileService";
import { teamService } from "@/services/teamService";
import { agentCommissionService } from "@/services/agentCommissionService";

export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center">
      <p className="text-2xl font-extrabold text-ink">{value}</p>
      <p className="mt-1 text-xs font-semibold text-muted">{label}</p>
    </div>
  );
}

export default async function AgentPerformancePage() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin) return null;
  const [perf, commission] = await Promise.all([
    teamService.performanceFor(admin.id),
    agentCommissionService.summaryForAgent(admin.id),
  ]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">My Performance</h1>
      <p className="mt-1 text-sm text-muted">Real figures from your own leads and deals — nothing estimated.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Assigned Leads" value={perf.assigned} />
        <StatCard label="Contacted" value={perf.contacted} />
        <StatCard label="Interested" value={perf.interested} />
        <StatCard label="Site Visits" value={perf.siteVisits} />
        <StatCard label="Closed" value={perf.closed} />
        <StatCard label="Lost" value={perf.lost} />
        <StatCard label="Conversion Rate" value={perf.conversionRate !== null ? `${perf.conversionRate}%` : "—"} />
        <StatCard
          label="Avg. Follow-Up Time"
          value={perf.avgFollowUpCompletionHours !== null ? `${perf.avgFollowUpCompletionHours}h` : "—"}
        />
      </div>

      <h2 className="mt-6 font-heading text-lg font-bold text-ink">Commission</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Deals" value={commission.dealsCount} />
        <StatCard label="Earned" value={`Rs ${commission.commissionEarned.toLocaleString()}`} />
        <StatCard label="Paid" value={`Rs ${commission.commissionPaid.toLocaleString()}`} />
        <StatCard label="Pending" value={`Rs ${commission.commissionPending.toLocaleString()}`} />
      </div>
    </div>
  );
}
