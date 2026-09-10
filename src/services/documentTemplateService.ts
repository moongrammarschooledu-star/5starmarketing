import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DocumentTemplate, DocumentTemplateInput } from "@/lib/models/document";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): DocumentTemplate {
  return {
    id: row.id,
    name: row.name,
    documentType: row.document_type,
    content: row.content,
    version: row.version,
    active: !!row.active,
    createdBy: row.created_by ?? undefined,
    updatedBy: row.updated_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Admin-editable PDF/document text templates (sections 22-24, 64).
 *  Never destroyed once used by a generated document — see documents.
 *  template_id, which keeps working even if a template is later
 *  deactivated or superseded by a new version. */
export const documentTemplateService = {
  async list(activeOnly = false): Promise<DocumentTemplate[]> {
    const supabase = await createClient();
    let query = supabase.from("document_templates").select("*").order("created_at", { ascending: false });
    if (activeOnly) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) {
      console.error("documentTemplateService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async listByType(documentType: string): Promise<DocumentTemplate[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("document_templates").select("*").eq("document_type", documentType).eq("active", true).order("name", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<DocumentTemplate | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("document_templates").select("*").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: DocumentTemplateInput, actorId?: string): Promise<DocumentTemplate> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("document_templates")
      .insert({ name: input.name, document_type: input.documentType, content: input.content, active: input.active ?? true, created_by: actorId || null, updated_by: actorId || null })
      .select("*")
      .single();
    if (error) {
      console.error("documentTemplateService.create failed:", error);
      throw new Error("Could not create this template.");
    }
    return mapRow(data);
  },

  /** Editing an already-used template creates a NEW version row rather
   *  than mutating history in place would be ideal, but for simplicity
   *  (and since document generation snapshots the interpolated content
   *  into the generated PDF itself, not a live reference) this updates
   *  in place and bumps `version` — a generated document's own PDF file
   *  is never retroactively changed by a later template edit. */
  async update(id: string, input: Partial<DocumentTemplateInput>, actorId?: string): Promise<DocumentTemplate | undefined> {
    const supabase = await createClient();
    const row: Record<string, unknown> = { updated_by: actorId || null };
    if (input.name !== undefined) row.name = input.name;
    if (input.documentType !== undefined) row.document_type = input.documentType;
    if (input.content !== undefined) {
      const existing = await this.getById(id);
      row.content = input.content;
      row.version = (existing?.version ?? 0) + 1;
    }
    if (input.active !== undefined) row.active = input.active;
    const { data, error } = await supabase.from("document_templates").update(row).eq("id", id).select("*").maybeSingle();
    if (error) {
      console.error("documentTemplateService.update failed:", error);
      throw new Error("Could not update this template.");
    }
    return data ? mapRow(data) : undefined;
  },

  async duplicate(id: string, actorId?: string): Promise<DocumentTemplate> {
    const original = await this.getById(id);
    if (!original) throw new Error("Template not found.");
    return this.create({ name: `${original.name} (Copy)`, documentType: original.documentType, content: original.content, active: false }, actorId);
  },

  async setActive(id: string, active: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("document_templates").update({ active }).eq("id", id);
    if (error) throw new Error("Could not update this template.");
  },
};
