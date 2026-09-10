import { AlertTriangle } from "lucide-react";
import { dealService } from "@/services/dealService";
import { DealPipelineBoard } from "@/components/admin/deals/DealPipelineBoard";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function DealsPipelinePage() {
  await requireSection("deals");

  let deals: Awaited<ReturnType<typeof dealService.search>>["deals"] = [];
  let loadError: string | null = null;

  try {
    const result = await dealService.search({ page: 1, pageSize: 100 });
    deals = result.deals;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load the pipeline.";
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Deal Pipeline</h1>
      <p className="mt-1 text-sm text-muted">Move a deal by picking its next stage from the card. Every change saves immediately and is validated server-side.</p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <DealPipelineBoard deals={deals} />
    </div>
  );
}
