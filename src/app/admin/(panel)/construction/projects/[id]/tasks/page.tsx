import { constructionTaskService } from "@/services/constructionTaskService";
import { constructionPhaseService } from "@/services/constructionPhaseService";
import { constructionContractorService } from "@/services/constructionContractorService";
import { createClient } from "@/lib/supabase/server";
import { TaskManager } from "@/components/admin/construction/TaskManager";

export const dynamic = "force-dynamic";

export default async function ConstructionTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tasks, phases, contractors, supabase] = await Promise.all([constructionTaskService.list(id), constructionPhaseService.list(id), constructionContractorService.list(id), createClient()]);
  const { data: staff } = await supabase.from("admin_profiles").select("id, name").in("role", ["sales_agent", "sales_manager", "admin"]).eq("status", "Active");

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink">Tasks</h2>
      <TaskManager
        projectId={id}
        tasks={tasks}
        phases={phases.map((p) => ({ id: p.id, name: p.name }))}
        contractors={contractors.map((c) => ({ id: c.id, name: c.vendorName ?? "Contractor" }))}
        staff={staff ?? []}
      />
    </div>
  );
}
