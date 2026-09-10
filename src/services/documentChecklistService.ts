import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DocumentChecklist, DocumentChecklistItem, DocumentChecklistItemInput } from "@/lib/models/document";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapChecklist(row: any): DocumentChecklist {
  return { id: row.id, name: row.name, description: row.description ?? undefined, active: !!row.active, createdAt: row.created_at, updatedAt: row.updated_at };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItem(row: any): DocumentChecklistItem {
  return {
    id: row.id,
    checklistId: row.checklist_id,
    documentType: row.document_type,
    required: !!row.required,
    description: row.description ?? undefined,
    sortOrder: row.sort_order,
    applicablePropertyType: row.applicable_property_type ?? undefined,
    applicableDealType: row.applicable_deal_type ?? undefined,
    active: !!row.active,
    documentTypeLabel: row.document_types?.label ?? undefined,
  };
}

/** Checklist grouping (sections 13, 63) — purely organizational; which
 *  items actually apply to a given deal is resolved by
 *  documentService.getApplicableChecklistItems() matching item-level
 *  applicable_deal_type/applicable_property_type, not by "selecting" a
 *  whole checklist here. */
export const documentChecklistService = {
  async list(): Promise<DocumentChecklist[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("document_checklists").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("documentChecklistService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapChecklist);
  },

  async getById(id: string): Promise<DocumentChecklist | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("document_checklists").select("*").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapChecklist(data);
  },

  async create(input: { name: string; description?: string }): Promise<DocumentChecklist> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("document_checklists").insert({ name: input.name, description: input.description || null }).select("*").single();
    if (error) throw new Error("Could not create this checklist.");
    return mapChecklist(data);
  },

  async update(id: string, input: { name?: string; description?: string; active?: boolean }): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.description !== undefined) row.description = input.description || null;
    if (input.active !== undefined) row.active = input.active;
    const { error } = await supabase.from("document_checklists").update(row).eq("id", id);
    if (error) throw new Error("Could not update this checklist.");
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("document_checklists").delete().eq("id", id);
    if (error) throw new Error("Could not delete this checklist.");
  },

  async listItems(checklistId: string): Promise<DocumentChecklistItem[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("document_checklist_items").select("*, document_types(label)").eq("checklist_id", checklistId).order("sort_order", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapItem);
  },

  async addItem(input: DocumentChecklistItemInput): Promise<DocumentChecklistItem> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("document_checklist_items")
      .insert({
        checklist_id: input.checklistId,
        document_type: input.documentType,
        required: input.required,
        description: input.description || null,
        sort_order: input.sortOrder,
        applicable_property_type: input.applicablePropertyType || null,
        applicable_deal_type: input.applicableDealType || null,
        active: input.active,
      })
      .select("*, document_types(label)")
      .single();
    if (error) {
      console.error("documentChecklistService.addItem failed:", error);
      throw new Error("Could not add this checklist item.");
    }
    return mapItem(data);
  },

  async updateItem(id: string, input: Partial<DocumentChecklistItemInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.documentType !== undefined) row.document_type = input.documentType;
    if (input.required !== undefined) row.required = input.required;
    if (input.description !== undefined) row.description = input.description || null;
    if (input.sortOrder !== undefined) row.sort_order = input.sortOrder;
    if (input.applicablePropertyType !== undefined) row.applicable_property_type = input.applicablePropertyType || null;
    if (input.applicableDealType !== undefined) row.applicable_deal_type = input.applicableDealType || null;
    if (input.active !== undefined) row.active = input.active;
    const { error } = await supabase.from("document_checklist_items").update(row).eq("id", id);
    if (error) throw new Error("Could not update this checklist item.");
  },

  async removeItem(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("document_checklist_items").delete().eq("id", id);
    if (error) throw new Error("Could not remove this checklist item.");
  },
};
