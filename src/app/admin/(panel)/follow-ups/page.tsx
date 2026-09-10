import { AlertTriangle } from "lucide-react";
import { followUpService } from "@/services/followUpService";
import { teamService } from "@/services/teamService";
import { requireSection } from "@/lib/guard";
import { formatDateOnly } from "@/lib/date";
import { FollowUpCenterFilters } from "@/components/admin/FollowUpCenterFilters";
import { FollowUpRowActions } from "@/components/admin/FollowUpRowActions";
import type { FollowUpStatus } from "@/lib/models/team";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<FollowUpStatus, string> = {
  Pending: "bg-primary/10 text-primary",
  Completed: "bg-success/10 text-success",
  Cancelled: "bg-muted/20 text-muted",
  Overdue: "bg-amber-500/10 text-amber-600",
};

export default async function AdminFollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; agent?: string; status?: string }>;
}) {
  await requireSection("followUps");
  const sp = await searchParams;
  const range = (sp.range as "today" | "tomorrow" | "week" | "overdue" | undefined) || undefined;
  const status = (sp.status as FollowUpStatus | undefined) || undefined;

  await followUpService.markOverdue();

  let followUps: Awaited<ReturnType<typeof followUpService.listAll>> = [];
  let agents: Awaited<ReturnType<typeof teamService.listAssignable>> = [];
  let loadError: string | null = null;
  try {
    [followUps, agents] = await Promise.all([
      followUpService.listAll({ range, agentId: sp.agent || undefined, status }),
      teamService.listAssignable(),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load follow-ups.";
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Follow-Up Center</h1>
      <p className="mt-1 text-sm text-muted">Every scheduled follow-up across the whole sales team, in one place.</p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6">
        <FollowUpCenterFilters agents={agents} currentRange={range} currentAgent={sp.agent} currentStatus={status} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {followUps.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  No follow-ups match these filters.
                </td>
              </tr>
            )}
            {followUps.map((f) => (
              <tr key={f.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                <td className="px-4 py-3 font-semibold text-ink">{f.leadName || "—"}</td>
                <td className="px-4 py-3 text-muted">{f.propertyTitle || "—"}</td>
                <td className="px-4 py-3 text-muted">{f.agentName || "Unassigned"}</td>
                <td className="px-4 py-3 text-xs text-muted">{formatDateOnly(f.followUpDate)}</td>
                <td className="px-4 py-3 text-xs text-muted">{f.followUpTime || "—"}</td>
                <td className="px-4 py-3 text-muted">{f.type}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_TONE[f.status]}`}>{f.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <FollowUpRowActions id={f.id} status={f.status} leadId={f.leadId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
