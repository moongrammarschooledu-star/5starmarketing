import "server-only";
import { createClient } from "@/lib/supabase/server";
import { legalAuditService } from "./legalAuditService";
import { legalChecklistService } from "./legalChecklistService";
import { DUE_DILIGENCE_ALLOWED_TRANSITIONS } from "@/lib/models/legal";
import type { DueDiligenceCase, DueDiligenceCaseInput, DueDiligenceStatus, DueDiligenceCompletionScore } from "@/lib/models/legal";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const SELECT = "*, properties(title), deals(deal_number), officer:admin_profiles!due_diligence_cases_legal_officer_id_fkey(name), requester:admin_profiles!due_diligence_cases_requested_by_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): DueDiligenceCase {
  return {
    id: row.id,
    caseNumber: row.case_number,
    propertyId: row.property_id,
    propertyTitle: row.properties?.title ?? undefined,
    dealId: row.deal_id ?? undefined,
    dealNumber: row.deals?.deal_number ?? undefined,
    checklistTemplateId: row.checklist_template_id ?? undefined,
    transactionType: row.transaction_type,
    status: row.status,
    legalOfficerId: row.legal_officer_id ?? undefined,
    legalOfficerName: row.officer?.name ?? undefined,
    requestedBy: row.requested_by ?? undefined,
    requestedByName: row.requester?.name ?? undefined,
    targetCompletionDate: row.target_completion_date ?? undefined,
    completedAt: row.completed_at ?? undefined,
    outcomeSummary: row.outcome_summary ?? undefined,
    internalRiskNotes: row.internal_risk_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const dueDiligenceService = {
  async list(filters?: { propertyId?: string; status?: DueDiligenceStatus; legalOfficerId?: string }): Promise<DueDiligenceCase[]> {
    const supabase = await createClient();
    let query = supabase.from("due_diligence_cases").select(SELECT).order("created_at", { ascending: false });
    if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.legalOfficerId) query = query.eq("legal_officer_id", filters.legalOfficerId);
    const { data, error } = await query;
    if (error) {
      console.error("dueDiligenceService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  /** Column-limited — never exposes internalRiskNotes/outcomeSummary
   *  to a customer-facing caller. */
  async listCustomerSafe(dealId?: string, propertyId?: string): Promise<Pick<DueDiligenceCase, "id" | "caseNumber" | "status" | "transactionType" | "targetCompletionDate" | "completedAt" | "propertyId" | "propertyTitle">[]> {
    const supabase = await createClient();
    let query = supabase.from("due_diligence_cases").select("id, case_number, status, transaction_type, target_completion_date, completed_at, property_id, properties(title)");
    if (dealId) query = query.eq("deal_id", dealId);
    else if (propertyId) query = query.eq("property_id", propertyId);
    else return [];
    const { data, error } = await query;
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[]).map((row) => ({
      id: row.id,
      caseNumber: row.case_number,
      status: row.status,
      transactionType: row.transaction_type,
      targetCompletionDate: row.target_completion_date ?? undefined,
      completedAt: row.completed_at ?? undefined,
      propertyId: row.property_id,
      propertyTitle: row.properties?.title ?? undefined,
    }));
  },

  async getById(id: string): Promise<DueDiligenceCase | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("due_diligence_cases").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: DueDiligenceCaseInput, actorId: string, actorName: string): Promise<DueDiligenceCase> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("due_diligence_cases")
      .insert({
        property_id: input.propertyId,
        deal_id: input.dealId || null,
        checklist_template_id: input.checklistTemplateId || null,
        transaction_type: input.transactionType ?? "PURCHASE",
        legal_officer_id: input.legalOfficerId || null,
        requested_by: actorId,
        target_completion_date: input.targetCompletionDate || null,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("dueDiligenceService.create failed:", error);
      throw new Error("Could not create this due-diligence case.");
    }
    const dd = mapRow(data);
    if (input.checklistTemplateId) {
      await legalChecklistService.initializeResults("DUE_DILIGENCE_CASE", dd.id, input.checklistTemplateId);
    }
    await legalAuditService.log({ entityType: "due_diligence_case", entityId: dd.id, action: "Opened", actorId, actorName, newValue: { caseNumber: dd.caseNumber } });
    return dd;
  },

  async assignOfficer(id: string, legalOfficerId: string | null, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("due_diligence_cases").update({ legal_officer_id: legalOfficerId }).eq("id", id);
    if (error) throw new Error("Could not assign a legal officer to this case.");
    await legalAuditService.log({ entityType: "due_diligence_case", entityId: id, action: legalOfficerId ? "Officer assigned" : "Officer unassigned", actorId, actorName });
  },

  async updateStatus(id: string, nextStatus: DueDiligenceStatus, actorId: string, actorName: string, note?: { outcomeSummary?: string; internalRiskNotes?: string }): Promise<DueDiligenceCase> {
    const current = await this.getById(id);
    if (!current) throw new Error("Due-diligence case not found.");
    if (!DUE_DILIGENCE_ALLOWED_TRANSITIONS[current.status]?.includes(nextStatus)) {
      throw new Error(`Cannot move a due-diligence case from "${current.status}" to "${nextStatus}".`);
    }
    const supabase = await createClient();
    const row: Record<string, unknown> = { status: nextStatus };
    if (["COMPLETED", "CLEARED_WITH_CONDITIONS"].includes(nextStatus)) row.completed_at = new Date().toISOString();
    if (note?.outcomeSummary !== undefined) row.outcome_summary = note.outcomeSummary || null;
    if (note?.internalRiskNotes !== undefined) row.internal_risk_notes = note.internalRiskNotes || null;
    const { data, error } = await supabase.from("due_diligence_cases").update(row).eq("id", id).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not update this case's status.");
    await legalAuditService.log({ entityType: "due_diligence_case", entityId: id, action: `Status changed to ${nextStatus}`, actorId, actorName, oldValue: { status: current.status }, newValue: { status: nextStatus } });
    return mapRow(data);
  },

  /** Clearly distinguishes CHECKLIST COMPLETION from LEGAL CLEARANCE —
   *  never auto-labels 100% completion as "legally clear". */
  async completionScore(id: string): Promise<DueDiligenceCompletionScore> {
    const results = await legalChecklistService.listResults("DUE_DILIGENCE_CASE", id);
    const totalItems = results.length;
    const passedItems = results.filter((r) => r.status === "PASSED").length;
    const failedItems = results.filter((r) => r.status === "FAILED").length;
    const requiresReviewItems = results.filter((r) => r.status === "REQUIRES_REVIEW").length;
    const notApplicableItems = results.filter((r) => r.status === "NOT_APPLICABLE").length;
    const notCheckedItems = results.filter((r) => r.status === "NOT_CHECKED").length;
    const checkable = totalItems - notApplicableItems;
    return {
      caseId: id,
      totalItems,
      passedItems,
      failedItems,
      requiresReviewItems,
      notApplicableItems,
      notCheckedItems,
      checklistCompletionPercent: checkable > 0 ? round2(((checkable - notCheckedItems) / checkable) * 100) : null,
    };
  },

  async listOverdue(): Promise<DueDiligenceCase[]> {
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("due_diligence_cases")
      .select(SELECT)
      .not("target_completion_date", "is", null)
      .lt("target_completion_date", today)
      .not("status", "in", "(COMPLETED,CLEARED_WITH_CONDITIONS,CANCELLED)");
    if (error) return [];
    return (data ?? []).map(mapRow);
  },
};
