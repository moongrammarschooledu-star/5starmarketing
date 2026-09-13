import { constructionProgressService } from "@/services/constructionProgressService";
import { constructionPhaseService } from "@/services/constructionPhaseService";
import { ProgressUpdateForm } from "@/components/admin/construction/ProgressUpdateForm";
import { GenerateProgressReportButton } from "@/components/admin/construction/GenerateProgressReportButton";
import { TrendChart } from "@/components/admin/charts/TrendChart";

export const dynamic = "force-dynamic";

export default async function ConstructionProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [summary, updates, phases] = await Promise.all([constructionProgressService.overallProgress(id), constructionProgressService.listUpdates(id), constructionPhaseService.list(id)]);

  const trend = [...updates]
    .filter((u) => u.updateType === "OVERALL" && u.actualPercent != null)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    .map((u) => ({ date: new Date(u.createdAt).toLocaleDateString("en-GB", { month: "short", day: "numeric" }), count: u.actualPercent! }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-bold text-ink">Progress Tracking</h2>
        <GenerateProgressReportButton projectId={id} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Actual" value={`${summary.actualPercent.toFixed(1)}%`} accent />
        <Metric label="Planned" value={summary.plannedPercent != null ? `${summary.plannedPercent.toFixed(1)}%` : "Insufficient data"} />
        <Metric label="Variance" value={summary.variancePercent != null ? `${summary.variancePercent > 0 ? "+" : ""}${summary.variancePercent.toFixed(1)}%` : "Insufficient data"} />
        <Metric label="Calculation" value={summary.usedWeighting ? "Weighted by phase" : "Simple average"} />
      </div>
      <p className="mt-2 text-xs text-muted">Planned % is a linear estimate based on the project&apos;s start/planned-completion dates — not a detailed schedule-network calculation.</p>

      <div className="mt-6">
        <TrendChart title="Overall Progress Over Time (Actual %)" data={trend} empty="Insufficient data for this report — record a progress update below." />
      </div>

      <div className="mt-6">
        <ProgressUpdateForm projectId={id} phases={phases.map((p) => ({ id: p.id, name: p.name }))} />
      </div>

      <div className="mt-6 space-y-2">
        <h3 className="font-heading text-base font-bold text-ink">Update History</h3>
        {updates.map((u) => (
          <div key={u.id} className="rounded-xl border border-border bg-surface p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">
                {u.updateType} {u.actualPercent != null ? `— ${u.actualPercent}%` : ""}
              </p>
              <p className="text-[10px] text-muted">{new Date(u.createdAt).toLocaleString("en-GB")}</p>
            </div>
            {u.notes && <p className="mt-1 text-xs text-muted">{u.notes}</p>}
            {u.customerVisible && <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">Visible to customer</span>}
          </div>
        ))}
        {updates.length === 0 && <p className="text-sm text-muted">No progress updates recorded yet.</p>}
      </div>
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
