import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { InspectionTemplate, InspectionTemplateInput, InspectionChecklistItemDef, InspectionChecklistItemDefInput } from "@/lib/models/maintenance";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTemplateRow(row: any): InspectionTemplate {
  return { id: row.id, name: row.name, description: row.description ?? undefined, active: !!row.active, createdAt: row.created_at, updatedAt: row.updated_at };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItemRow(row: any): InspectionChecklistItemDef {
  return { id: row.id, templateId: row.template_id, category: row.category, item: row.item, required: !!row.required, sortOrder: row.sort_order };
}

export const inspectionTemplateService = {
  async list(activeOnly = false): Promise<InspectionTemplate[]> {
    const supabase = await createClient();
    let query = supabase.from("inspection_templates").select("*").order("created_at", { ascending: false });
    if (activeOnly) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map(mapTemplateRow);
  },

  async getById(id: string): Promise<InspectionTemplate | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("inspection_templates").select("*").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapTemplateRow(data);
  },

  async create(input: InspectionTemplateInput, actorId: string): Promise<InspectionTemplate> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("inspection_templates").insert({ name: input.name, description: input.description || null, active: input.active ?? true, created_by: actorId }).select("*").single();
    if (error) throw new Error("Could not create this template.");
    return mapTemplateRow(data);
  },

  async update(id: string, input: Partial<InspectionTemplateInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.description !== undefined) row.description = input.description || null;
    if (input.active !== undefined) row.active = input.active;
    const { error } = await supabase.from("inspection_templates").update(row).eq("id", id);
    if (error) throw new Error("Could not update this template.");
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("inspection_templates").delete().eq("id", id);
    if (error) throw new Error("Could not delete this template.");
  },

  async listItems(templateId: string): Promise<InspectionChecklistItemDef[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("inspection_checklist_items").select("*").eq("template_id", templateId).order("sort_order", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapItemRow);
  },

  async addItem(templateId: string, input: InspectionChecklistItemDefInput): Promise<InspectionChecklistItemDef> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inspection_checklist_items")
      .insert({ template_id: templateId, category: input.category, item: input.item, required: input.required ?? true, sort_order: input.sortOrder ?? 100 })
      .select("*")
      .single();
    if (error) throw new Error("Could not add this checklist item.");
    return mapItemRow(data);
  },

  async removeItem(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("inspection_checklist_items").delete().eq("id", id);
    if (error) throw new Error("Could not remove this checklist item.");
  },

  /** Seeds the standard 20-category starter template exactly once — the
   *  admin can edit/add/remove items afterward; this never runs again if
   *  a template already exists. */
  async ensureDefaultTemplate(actorId: string): Promise<InspectionTemplate> {
    const existing = await this.list();
    if (existing.length > 0) return existing[0];
    const template = await this.create({ name: "Standard Property Inspection", description: "Default checklist covering the full property." }, actorId);
    const items: { category: InspectionChecklistItemDefInput["category"]; item: string }[] = [
      { category: "Exterior", item: "Exterior walls and paint" },
      { category: "Structure", item: "Foundation and structural integrity" },
      { category: "Roof", item: "Roof condition and leaks" },
      { category: "Walls", item: "Interior wall condition" },
      { category: "Doors", item: "Main entrance door" },
      { category: "Windows", item: "Window frames and glass" },
      { category: "Flooring", item: "Flooring condition" },
      { category: "Ceiling", item: "Ceiling condition" },
      { category: "Electrical", item: "Wiring and switches" },
      { category: "Plumbing", item: "Pipes and fixtures" },
      { category: "Kitchen", item: "Kitchen fittings and cabinets" },
      { category: "Bathrooms", item: "Bathroom fittings and drainage" },
      { category: "HVAC", item: "Air conditioning/heating units" },
      { category: "Water Supply", item: "Water supply and tank" },
      { category: "Drainage", item: "Drainage system" },
      { category: "Security", item: "Locks, gates and security systems" },
      { category: "Parking", item: "Parking area condition" },
      { category: "Garden", item: "Garden/outdoor area" },
      { category: "Common Areas", item: "Shared/common areas" },
      { category: "Other", item: "General observations" },
    ];
    await Promise.all(items.map((it, i) => this.addItem(template.id, { category: it.category, item: it.item, required: true, sortOrder: (i + 1) * 10 })));
    return template;
  },
};
