import { constructionSafetyService } from "@/services/constructionSafetyService";
import { createClient } from "@/lib/supabase/server";
import { SafetyManager } from "@/components/admin/construction/SafetyManager";

export const dynamic = "force-dynamic";

export default async function ConstructionSafetyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [records, supabase] = await Promise.all([constructionSafetyService.list(id), createClient()]);
  const { data: staff } = await supabase.from("admin_profiles").select("id, name").in("role", ["sales_agent", "sales_manager", "admin"]).eq("status", "Active");

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink">Safety</h2>
      <p className="mt-1 text-xs text-muted">A working log of hazards, incidents and inspections — not a legal compliance certification.</p>
      <SafetyManager projectId={id} records={records} staff={staff ?? []} />
    </div>
  );
}
