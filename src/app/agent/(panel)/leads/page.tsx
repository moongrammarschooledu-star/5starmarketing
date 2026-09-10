import { AlertTriangle } from "lucide-react";
import { profileService } from "@/services/profileService";
import { leadService } from "@/services/leadService";
import { AgentLeadsTable } from "@/components/agent/AgentLeadsTable";

export const dynamic = "force-dynamic";

export default async function AgentLeadsPage() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
        <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> You need to be signed in to view your leads.
      </div>
    );
  }

  let leads: Awaited<ReturnType<typeof leadService.listByAgent>> = [];
  let loadError: string | null = null;
  try {
    leads = await leadService.listByAgent(admin.id);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load your leads.";
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">My Leads</h1>
      <p className="mt-1 text-sm text-muted">Every lead assigned to you.</p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6">
        <AgentLeadsTable leads={leads} />
      </div>
    </div>
  );
}
