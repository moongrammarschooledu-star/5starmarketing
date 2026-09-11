import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { automationService } from "@/services/automationService";
import { marketingTagService } from "@/services/marketingTagService";
import { teamService } from "@/services/teamService";
import { WorkflowDetailEditor } from "@/components/admin/marketing/WorkflowDetailEditor";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("marketing");
  const { id } = await params;
  const workflow = await automationService.getWorkflow(id);
  if (!workflow) notFound();

  const [actions, tags, agents] = await Promise.all([automationService.listActions(id), marketingTagService.list(), teamService.listAssignable()]);

  return (
    <div>
      <Link href="/admin/marketing/automation/workflows" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Workflows
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{workflow.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Trigger: <span className="font-semibold text-ink">{workflow.triggerType}</span>
            {workflow.description && ` — ${workflow.description}`}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${workflow.active ? "bg-success/10 text-success" : "bg-muted/20 text-muted"}`}>{workflow.active ? "Active" : "Paused"}</span>
      </div>

      <div className="mt-6">
        <WorkflowDetailEditor workflow={workflow} actions={actions} tags={tags} agents={agents.map((a) => ({ id: a.id, name: a.name }))} />
      </div>
    </div>
  );
}
