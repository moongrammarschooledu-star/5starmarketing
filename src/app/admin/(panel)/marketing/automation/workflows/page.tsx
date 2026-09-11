import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { automationService } from "@/services/automationService";
import { WorkflowListManager } from "@/components/admin/marketing/WorkflowListManager";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  await requireSection("marketing");
  const workflows = await automationService.listWorkflows();

  return (
    <div>
      <Link href="/admin/marketing/automation" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Automation
      </Link>
      <div className="mt-4">
        <h1 className="font-heading text-2xl font-extrabold text-ink">Workflows</h1>
        <p className="mt-1 text-sm text-muted">Trigger → condition → action. A new workflow starts paused until you&apos;ve added at least one action.</p>
      </div>
      <div className="mt-6">
        <WorkflowListManager workflows={workflows} />
      </div>
    </div>
  );
}
