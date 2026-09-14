import "server-only";
import { createClient } from "@/lib/supabase/server";
import { legalAuditService } from "./legalAuditService";
import type { LegalApproval, LegalApprovalInput, LegalApprovalSubjectType } from "@/lib/models/legal";

const SELECT = "*, requester:admin_profiles!legal_approvals_requested_by_fkey(name), approver:admin_profiles!legal_approvals_approver_id_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): LegalApproval {
  return {
    id: row.id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    approvalStage: row.approval_stage,
    status: row.status,
    requestedBy: row.requested_by ?? undefined,
    requestedByName: row.requester?.name ?? undefined,
    approverId: row.approver_id ?? undefined,
    approverName: row.approver?.name ?? undefined,
    decidedAt: row.decided_at ?? undefined,
    comments: row.comments ?? undefined,
    createdAt: row.created_at,
  };
}

export const legalApprovalService = {
  async listForSubject(subjectType: LegalApprovalSubjectType, subjectId: string): Promise<LegalApproval[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("legal_approvals").select(SELECT).eq("subject_type", subjectType).eq("subject_id", subjectId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async listPending(): Promise<LegalApproval[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("legal_approvals").select(SELECT).eq("status", "PENDING").order("created_at", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async request(input: LegalApprovalInput, actorId: string): Promise<LegalApproval> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("legal_approvals")
      .insert({
        subject_type: input.subjectType,
        subject_id: input.subjectId,
        approval_stage: input.approvalStage || "Review",
        requested_by: actorId,
        approver_id: input.approverId || null,
        comments: input.comments || null,
      })
      .select(SELECT)
      .single();
    if (error) throw new Error("Could not request this approval.");
    return mapRow(data);
  },

  async decide(id: string, status: "APPROVED" | "REJECTED", actorId: string, actorName: string, comments?: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("legal_approvals").update({ status, approver_id: actorId, decided_at: new Date().toISOString(), comments: comments || null }).eq("id", id).eq("status", "PENDING");
    if (error) throw new Error("Could not record this approval decision.");
    await legalAuditService.log({ entityType: "legal_approval", entityId: id, action: `${status === "APPROVED" ? "Approved" : "Rejected"}`, actorId, actorName, reason: comments });
  },
};
