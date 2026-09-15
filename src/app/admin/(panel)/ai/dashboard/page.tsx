import { requireSection } from "@/lib/guard";
import { aiAuditService } from "@/services/aiAuditService";
import { aiConfigService } from "@/services/aiConfigService";
import { assistantLabels, assistantTypes } from "@/lib/models/ai";

export const dynamic = "force-dynamic";

export default async function AiDashboardPage() {
  await requireSection("ai");
  const [usage, configs] = await Promise.all([aiAuditService.usageSummary(30), aiConfigService.listAll()]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">AI Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Usage over the last 30 days. Cost figures are shown only when the provider actually reports them.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Requests" value={String(usage.requests)} />
        <StatCard label="Tool Calls" value={String(usage.toolCalls)} />
        <StatCard label="Errors" value={String(usage.errors)} accent={usage.errors > 0} />
        <StatCard label="Avg Latency" value={usage.avgLatencyMs !== null ? `${usage.avgLatencyMs} ms` : "—"} />
      </div>

      <p className="mt-3 text-xs text-muted">
        Estimated cost is not shown because the current AI Gateway response does not include per-request cost data for this deployment.
      </p>

      <h2 className="mt-8 font-heading text-lg font-bold text-ink">Assistant Status</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs font-bold uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Assistant</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Write Actions</th>
              <th className="px-4 py-3">Approval Required</th>
            </tr>
          </thead>
          <tbody>
            {assistantTypes.map((type) => {
              const cfg = configs.find((c) => c.assistantType === type);
              return (
                <tr key={type} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{assistantLabels[type]}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cfg?.enabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {cfg?.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{cfg?.model ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{cfg?.allowWriteActions ? "Allowed" : "Read-only"}</td>
                  <td className="px-4 py-3 text-muted">{cfg?.requireApprovalForWrite ? "Yes" : "No"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-lg font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}
