import { constructionProjectService } from "@/services/constructionProjectService";
import { constructionProgressService } from "@/services/constructionProgressService";
import { constructionReportService } from "@/services/constructionReportService";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

export default async function ConstructionOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, progress, profitability] = await Promise.all([constructionProjectService.getById(id), constructionProgressService.overallProgress(id), constructionReportService.profitability(id)]);
  if (!project) return null;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Actual Progress" value={`${progress.actualPercent.toFixed(1)}%`} accent />
        <Metric label="Planned Progress" value={progress.plannedPercent != null ? `${progress.plannedPercent.toFixed(1)}%` : "Insufficient data"} />
        <Metric label="Variance" value={progress.variancePercent != null ? `${progress.variancePercent > 0 ? "+" : ""}${progress.variancePercent.toFixed(1)}%` : "Insufficient data"} />
        <Metric label="Weighting" value={progress.usedWeighting ? "Weighted by phase" : "Simple average"} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-heading text-base font-bold text-ink">Project Details</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Detail label="Customer" value={project.customerName ?? "—"} />
          <Detail label="Deal" value={project.dealNumber ?? "—"} />
          <Detail label="Reference Project" value={project.referenceProjectName ?? "—"} />
          <Detail label="Property" value={project.propertyTitle ?? "—"} />
          <Detail label="Project Manager" value={project.projectManagerName ?? "Unassigned"} />
          <Detail label="Site Manager" value={project.siteManagerName ?? "Unassigned"} />
          <Detail label="Start Date" value={project.startDate ? new Date(project.startDate).toLocaleDateString("en-GB") : "—"} />
          <Detail label="Planned Completion" value={project.plannedCompletionDate ? new Date(project.plannedCompletionDate).toLocaleDateString("en-GB") : "—"} />
          <Detail label="Actual Completion" value={project.actualCompletionDate ? new Date(project.actualCompletionDate).toLocaleDateString("en-GB") : "—"} />
        </div>
        {project.description && <p className="mt-4 text-sm text-muted">{project.description}</p>}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-heading text-base font-bold text-ink">Profitability (Section 25 — Estimated vs Actual)</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Detail label="Contract Value" value={profitability.contractValue != null ? formatPKR(profitability.contractValue) : "—"} />
          <Detail label="Approved Budget" value={profitability.approvedBudget != null ? formatPKR(profitability.approvedBudget) : "—"} />
          <Detail label="Committed Cost" value={formatPKR(profitability.committedCost)} />
          <Detail label="Actual Cost" value={formatPKR(profitability.actualCost)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Detail label="ESTIMATE — Remaining Cost" value={profitability.estimatedRemainingCost != null ? formatPKR(profitability.estimatedRemainingCost) : "Insufficient data"} />
          <Detail label="ESTIMATE — Profit" value={profitability.estimatedProfit != null ? formatPKR(profitability.estimatedProfit) : "Insufficient data"} accent />
          <Detail label="ACTUAL Revenue (from linked deal)" value={profitability.actualRevenue != null ? formatPKR(profitability.actualRevenue) : "Not linked to a deal"} />
          <Detail label="ACTUAL Profit" value={profitability.actualProfit != null ? formatPKR(profitability.actualProfit) : "Insufficient data"} accent />
        </div>
        <p className="mt-3 text-xs text-muted">ESTIMATE figures are projections based on the approved budget and committed costs — never a guarantee. ACTUAL figures require a linked deal with verified payments.</p>
      </div>

      {project.notes && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-heading text-base font-bold text-ink">Notes</h2>
          <p className="mt-2 text-sm text-muted">{project.notes}</p>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-lg font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function Detail({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}
