import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ConstructionApproval, ApprovalEntityType, ApprovalDecision } from "@/lib/models/construction";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ConstructionApproval {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    approverName: row.admin_profiles?.name ?? undefined,
    decision: row.decision,
    comments: row.comments ?? undefined,
    createdAt: row.created_at,
  };
}

export const constructionApprovalService = {
  async listForEntity(entityType: ApprovalEntityType, entityId: string): Promise<ConstructionApproval[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_approvals").select("*, admin_profiles(name)").eq("entity_type", entityType).eq("entity_id", entityId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async record(entityType: ApprovalEntityType, entityId: string, decision: ApprovalDecision, approverId: string, comments?: string): Promise<ConstructionApproval> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_approvals")
      .insert({ entity_type: entityType, entity_id: entityId, approver_id: approverId, decision, comments: comments || null })
      .select("*, admin_profiles(name)")
      .single();
    if (error) {
      console.error("constructionApprovalService.record failed:", error);
      throw new Error("Could not record this approval decision.");
    }
    return mapRow(data);
  },
};
