import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  LegalChecklistTemplate,
  LegalChecklistTemplateInput,
  LegalChecklistTemplateItem,
  LegalChecklistTemplateItemInput,
  LegalChecklistResult,
  LegalChecklistResultInput,
  ChecklistTemplateType,
  ChecklistResultSubjectType,
} from "@/lib/models/legal";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTemplate(row: any): LegalChecklistTemplate {
  return {
    id: row.id,
    name: row.name,
    templateType: row.template_type,
    applicablePropertyType: row.applicable_property_type ?? undefined,
    applicableProjectId: row.applicable_project_id ?? undefined,
    applicableProjectName: row.projects?.name ?? undefined,
    jurisdiction: row.jurisdiction ?? undefined,
    applicableTransactionType: row.applicable_transaction_type ?? undefined,
    active: !!row.active,
    itemCount: row.legal_checklist_template_items?.[0]?.count ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItem(row: any): LegalChecklistTemplateItem {
  return {
    id: row.id,
    templateId: row.template_id,
    itemLabel: row.item_label,
    description: row.description ?? undefined,
    documentTypeCode: row.document_type_code ?? undefined,
    required: !!row.required,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapResult(row: any): LegalChecklistResult {
  return {
    id: row.id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    templateItemId: row.template_item_id,
    itemLabel: row.legal_checklist_template_items?.item_label ?? undefined,
    itemRequired: row.legal_checklist_template_items?.required ?? undefined,
    status: row.status,
    evidenceDocumentId: row.evidence_document_id ?? undefined,
    notes: row.notes ?? undefined,
    checkedBy: row.checked_by ?? undefined,
    checkedByName: row.checker?.name ?? undefined,
    checkedAt: row.checked_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const legalChecklistService = {
  async listTemplates(templateType?: ChecklistTemplateType): Promise<LegalChecklistTemplate[]> {
    const supabase = await createClient();
    let query = supabase.from("legal_checklist_templates").select("*, projects(name), legal_checklist_template_items(count)").order("created_at", { ascending: false });
    if (templateType) query = query.eq("template_type", templateType);
    const { data, error } = await query;
    if (error) {
      console.error("legalChecklistService.listTemplates failed:", error);
      return [];
    }
    return (data ?? []).map(mapTemplate);
  },

  async getTemplate(id: string): Promise<LegalChecklistTemplate | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("legal_checklist_templates").select("*, projects(name)").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapTemplate(data);
  },

  async createTemplate(input: LegalChecklistTemplateInput, actorId: string): Promise<LegalChecklistTemplate> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("legal_checklist_templates")
      .insert({
        name: input.name,
        template_type: input.templateType,
        applicable_property_type: input.applicablePropertyType || null,
        applicable_project_id: input.applicableProjectId || null,
        jurisdiction: input.jurisdiction || null,
        applicable_transaction_type: input.applicableTransactionType || null,
        active: input.active ?? true,
        created_by: actorId,
      })
      .select("*, projects(name)")
      .single();
    if (error) throw new Error("Could not create this checklist template.");
    return mapTemplate(data);
  },

  async updateTemplate(id: string, input: Partial<LegalChecklistTemplateInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.applicablePropertyType !== undefined) row.applicable_property_type = input.applicablePropertyType || null;
    if (input.applicableProjectId !== undefined) row.applicable_project_id = input.applicableProjectId || null;
    if (input.jurisdiction !== undefined) row.jurisdiction = input.jurisdiction || null;
    if (input.applicableTransactionType !== undefined) row.applicable_transaction_type = input.applicableTransactionType || null;
    if (input.active !== undefined) row.active = input.active;
    const { error } = await supabase.from("legal_checklist_templates").update(row).eq("id", id);
    if (error) throw new Error("Could not update this checklist template.");
  },

  async listItems(templateId: string): Promise<LegalChecklistTemplateItem[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("legal_checklist_template_items").select("*").eq("template_id", templateId).order("sort_order", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapItem);
  },

  async addItem(input: LegalChecklistTemplateItemInput): Promise<LegalChecklistTemplateItem> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("legal_checklist_template_items")
      .insert({
        template_id: input.templateId,
        item_label: input.itemLabel,
        description: input.description || null,
        document_type_code: input.documentTypeCode || null,
        required: input.required ?? true,
        sort_order: input.sortOrder ?? 0,
      })
      .select("*")
      .single();
    if (error) throw new Error("Could not add this checklist item.");
    return mapItem(data);
  },

  async removeItem(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("legal_checklist_template_items").delete().eq("id", id);
    if (error) throw new Error("Could not remove this checklist item.");
  },

  // ---- Results (shared by due-diligence cases and compliance records) ----
  async listResults(subjectType: ChecklistResultSubjectType, subjectId: string): Promise<LegalChecklistResult[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("legal_checklist_results")
      .select("*, legal_checklist_template_items(item_label, required), checker:admin_profiles!legal_checklist_results_checked_by_fkey(name)")
      .eq("subject_type", subjectType)
      .eq("subject_id", subjectId);
    if (error) {
      console.error("legalChecklistService.listResults failed:", error);
      return [];
    }
    return (data ?? []).map(mapResult);
  },

  /** Ensures every template item has a NOT_CHECKED placeholder row —
   *  idempotent, never duplicates. Called when a case/compliance
   *  record is created or its template is assigned. */
  async initializeResults(subjectType: ChecklistResultSubjectType, subjectId: string, templateId: string): Promise<void> {
    const items = await this.listItems(templateId);
    if (items.length === 0) return;
    const supabase = await createClient();
    const rows = items.map((item) => ({ subject_type: subjectType, subject_id: subjectId, template_item_id: item.id, status: "NOT_CHECKED" as const }));
    const { error } = await supabase.from("legal_checklist_results").upsert(rows, { onConflict: "subject_type,subject_id,template_item_id", ignoreDuplicates: true });
    if (error) console.error("legalChecklistService.initializeResults failed:", error);
  },

  /** Never auto-verified — PASSED/FAILED/NOT_APPLICABLE/REQUIRES_REVIEW
   *  all require an explicit checked_by. */
  async recordResult(input: LegalChecklistResultInput, actorId: string): Promise<LegalChecklistResult> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("legal_checklist_results")
      .upsert(
        {
          subject_type: input.subjectType,
          subject_id: input.subjectId,
          template_item_id: input.templateItemId,
          status: input.status,
          evidence_document_id: input.evidenceDocumentId || null,
          notes: input.notes || null,
          checked_by: actorId,
          checked_at: input.status === "NOT_CHECKED" ? null : new Date().toISOString(),
        },
        { onConflict: "subject_type,subject_id,template_item_id" }
      )
      .select("*, legal_checklist_template_items(item_label, required), checker:admin_profiles!legal_checklist_results_checked_by_fkey(name)")
      .single();
    if (error) {
      console.error("legalChecklistService.recordResult failed:", error);
      throw new Error("Could not record this checklist result.");
    }
    return mapResult(data);
  },
};
