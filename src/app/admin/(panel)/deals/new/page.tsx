import { AlertTriangle } from "lucide-react";
import { leadService } from "@/services/leadService";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { teamService } from "@/services/teamService";
import { settingsService } from "@/services/settingsService";
import { DealForm } from "@/components/admin/deals/DealForm";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function NewDealPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  await requireSection("deals");
  const { lead: leadId } = await searchParams;

  const [lead, properties, projects, agents, settings] = await Promise.all([
    leadId ? leadService.getById(leadId) : Promise.resolve(undefined),
    propertyService.list(),
    projectService.list(),
    teamService.listAssignable(),
    settingsService.get().catch(() => null),
  ]);

  if (leadId && !lead) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
        <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> That lead could not be found.
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">New Deal</h1>
      <p className="mt-1 text-sm text-muted">
        {lead ? `Creating a deal from the lead "${lead.name}".` : "Create a new transaction and start moving it through the pipeline."}
      </p>

      <div className="mt-6 max-w-3xl">
        <DealForm
          lead={lead}
          properties={properties.map((p) => ({ id: p.id, title: p.title, status: p.status, priceValue: p.priceValue }))}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          agents={agents}
          defaultCommissionRate={settings?.defaultCommissionRate}
        />
      </div>
    </div>
  );
}
