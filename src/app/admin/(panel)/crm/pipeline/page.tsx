import { AlertTriangle } from "lucide-react";
import { leadService } from "@/services/leadService";
import { CrmPipelineBoard } from "@/components/admin/crm/CrmPipelineBoard";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function CrmPipelinePage() {
  await requireSection("leads");

  let leads: Awaited<ReturnType<typeof leadService.search>>["leads"] = [];
  let loadError: string | null = null;

  try {
    const result = await leadService.search({ page: 1, pageSize: 100 });
    leads = result.leads;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load the pipeline.";
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Pipeline</h1>
      <p className="mt-1 text-sm text-muted">Drag-free Kanban — move a lead by picking its next stage from the card. Every change saves immediately.</p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <CrmPipelineBoard leads={leads} />
    </div>
  );
}
