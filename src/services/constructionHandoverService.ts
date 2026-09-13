import "server-only";
import { createClient } from "@/lib/supabase/server";
import { constructionAuditService } from "./constructionAuditService";
import { HANDOVER_ALLOWED_TRANSITIONS } from "@/lib/models/construction";
import type { ConstructionHandover, HandoverStatus } from "@/lib/models/construction";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ConstructionHandover {
  return {
    id: row.id,
    projectId: row.project_id,
    practicalCompletionDate: row.practical_completion_date ?? undefined,
    finalInspectionDate: row.final_inspection_date ?? undefined,
    defectListCompleted: !!row.defect_list_completed,
    defectsResolved: !!row.defects_resolved,
    customerVerified: !!row.customer_verified,
    customerVerifiedAt: row.customer_verified_at ?? undefined,
    handoverApproved: !!row.handover_approved,
    handoverApprovedByName: row.approved?.name ?? undefined,
    handoverDate: row.handover_date ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = "*, approved:admin_profiles!construction_handover_handover_approved_by_fkey(name)";

function assertTransition(from: HandoverStatus, to: HandoverStatus) {
  if (!HANDOVER_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot move handover from ${from} to ${to}.`);
  }
}

export const constructionHandoverService = {
  async getForProject(projectId: string): Promise<ConstructionHandover | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_handover").select(SELECT).eq("project_id", projectId).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async ensureForProject(projectId: string): Promise<ConstructionHandover> {
    const existing = await this.getForProject(projectId);
    if (existing) return existing;
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_handover").insert({ project_id: projectId }).select(SELECT).single();
    if (error) {
      console.error("constructionHandoverService.ensureForProject failed:", error);
      throw new Error("Could not create the handover record for this project.");
    }
    return mapRow(data);
  },

  async advance(projectId: string, newStatus: HandoverStatus, actorId: string, actorName: string): Promise<ConstructionHandover> {
    const handover = await this.ensureForProject(projectId);
    assertTransition(handover.status, newStatus);

    const supabase = await createClient();
    const extra: Record<string, unknown> = { status: newStatus };
    if (newStatus === "PRACTICAL_COMPLETION") extra.practical_completion_date = new Date().toISOString().slice(0, 10);
    if (newStatus === "FINAL_INSPECTION") extra.final_inspection_date = new Date().toISOString().slice(0, 10);
    if (newStatus === "DEFECT_RESOLUTION") extra.defect_list_completed = true;
    if (newStatus === "CUSTOMER_VERIFICATION") extra.defects_resolved = true;
    if (newStatus === "APPROVED") {
      extra.handover_approved = true;
      extra.handover_approved_by = actorId;
    }
    if (newStatus === "COMPLETED") extra.handover_date = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase.from("construction_handover").update(extra).eq("project_id", projectId).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not advance the handover workflow.");
    await constructionAuditService.log({ entityType: "handover", entityId: handover.id, action: `Advanced to ${newStatus}`, actorId, actorName, oldValue: { status: handover.status } });
    return mapRow(data);
  },

  async recordCustomerVerification(projectId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("construction_handover").update({ customer_verified: true, customer_verified_at: new Date().toISOString() }).eq("project_id", projectId);
    if (error) throw new Error("Could not record your verification.");
  },
};
