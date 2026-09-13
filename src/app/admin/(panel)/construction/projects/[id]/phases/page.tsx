import { constructionPhaseService } from "@/services/constructionPhaseService";
import { createClient } from "@/lib/supabase/server";
import { PhaseManager } from "@/components/admin/construction/PhaseManager";
import { MilestoneManager } from "@/components/admin/construction/MilestoneManager";

export const dynamic = "force-dynamic";

export default async function ConstructionPhasesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [phases, milestones, supabase] = await Promise.all([constructionPhaseService.list(id), constructionPhaseService.listMilestones(id), createClient()]);
  const { data: staff } = await supabase.from("admin_profiles").select("id, name").in("role", ["sales_agent", "sales_manager", "admin"]).eq("status", "Active");

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink">Phases</h2>
      <div className="mt-3">
        <PhaseManager projectId={id} phases={phases} staff={staff ?? []} />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Milestones</h2>
        <div className="mt-3">
          <MilestoneManager projectId={id} milestones={milestones} phases={phases.map((p) => ({ id: p.id, name: p.name }))} />
        </div>
      </div>
    </div>
  );
}
