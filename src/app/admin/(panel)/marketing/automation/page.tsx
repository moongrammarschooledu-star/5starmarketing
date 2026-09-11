import Link from "next/link";
import { Workflow, ListChecks, Settings2, ArrowRight } from "lucide-react";
import { automationService } from "@/services/automationService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AutomationDashboardPage() {
  await requireSection("marketing");

  const [workflows, recentLogs] = await Promise.all([automationService.listWorkflows(), automationService.listLogs(undefined, 30)]);

  const active = workflows.filter((w) => w.active).length;
  const successCount = recentLogs.filter((l) => l.status === "SUCCESS").length;
  const failedCount = recentLogs.filter((l) => l.status === "FAILED").length;
  const skippedCount = recentLogs.filter((l) => l.status === "SKIPPED").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Marketing Automation</h1>
          <p className="mt-1 text-sm text-muted">Trigger → condition → action workflows connecting marketing activity to real CRM/deal events.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/marketing/automation/rules" className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
            <Settings2 className="h-3.5 w-3.5" /> Rules
          </Link>
          <Link href="/admin/marketing/automation/workflows" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover">
            <Workflow className="h-3.5 w-3.5" /> Workflows
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Active Workflows</p>
          <p className="mt-2 font-heading text-2xl font-extrabold text-ink">{active}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Recent Successes</p>
          <p className="mt-2 font-heading text-2xl font-extrabold text-success">{successCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Recent Failures</p>
          <p className="mt-2 font-heading text-2xl font-extrabold text-primary">{failedCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Skipped (Not Configured)</p>
          <p className="mt-2 font-heading text-2xl font-extrabold text-muted">{skippedCount}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
              <Workflow className="h-4.5 w-4.5 text-primary" /> Workflows
            </h2>
            <Link href="/admin/marketing/automation/workflows" className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {workflows.length === 0 && <p className="text-sm text-muted">No workflows yet.</p>}
            {workflows.slice(0, 8).map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted p-3 text-sm">
                <div>
                  <p className="font-semibold text-ink">{w.name}</p>
                  <p className="text-xs text-muted-foreground">{w.triggerType}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${w.active ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}>{w.active ? "Active" : "Paused"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
            <ListChecks className="h-4.5 w-4.5 text-primary" /> Recent Automation Activity
          </h2>
          <div className="mt-4 space-y-2">
            {recentLogs.length === 0 && <p className="text-sm text-muted">No automation has run yet.</p>}
            {recentLogs.slice(0, 8).map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {l.workflowName ?? l.triggerType} {l.leadName ? `— ${l.leadName}` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {l.actionType} · {new Date(l.executedAt).toLocaleString("en-GB")}
                    {l.error ? ` · ${l.error}` : ""}
                  </p>
                </div>
                <StatusBadge status={l.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
