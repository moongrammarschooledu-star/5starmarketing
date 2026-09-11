import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MarketingTemplate, MarketingTemplateInput, MarketingTemplateChannel } from "@/lib/models/marketingTemplate";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): MarketingTemplate {
  return {
    id: row.id,
    name: row.name,
    channel: row.channel,
    category: row.category,
    subject: row.subject ?? undefined,
    content: row.content,
    version: row.version,
    active: !!row.active,
    createdBy: row.created_by ?? undefined,
    updatedBy: row.updated_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** {{variable}} interpolation (section 26) — unmatched keys are left as
 *  literal visible text (never silently blanked), same discipline as the
 *  STEP 20 document-template interpolator. */
export function interpolateTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => (key in vars ? vars[key] : match));
}

export const marketingTemplateService = {
  async list(channel?: MarketingTemplateChannel, activeOnly = false): Promise<MarketingTemplate[]> {
    const supabase = await createClient();
    let query = supabase.from("marketing_templates").select("*").order("created_at", { ascending: false });
    if (channel) query = query.eq("channel", channel);
    if (activeOnly) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) {
      console.error("marketingTemplateService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<MarketingTemplate | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("marketing_templates").select("*").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: MarketingTemplateInput, actorId?: string): Promise<MarketingTemplate> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("marketing_templates")
      .insert({
        name: input.name,
        channel: input.channel,
        category: input.category,
        subject: input.subject || null,
        content: input.content,
        created_by: actorId || null,
        updated_by: actorId || null,
      })
      .select("*")
      .single();
    if (error) {
      console.error("marketingTemplateService.create failed:", error);
      throw new Error("Could not create this template.");
    }
    return mapRow(data);
  },

  async update(id: string, input: Partial<MarketingTemplateInput>, actorId?: string): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = { updated_by: actorId || null };
    if (input.name !== undefined) row.name = input.name;
    if (input.channel !== undefined) row.channel = input.channel;
    if (input.category !== undefined) row.category = input.category;
    if (input.subject !== undefined) row.subject = input.subject || null;
    if (input.content !== undefined) {
      const existing = await this.getById(id);
      row.content = input.content;
      row.version = (existing?.version ?? 0) + 1;
    }
    const { error } = await supabase.from("marketing_templates").update(row).eq("id", id);
    if (error) throw new Error("Could not update this template.");
  },

  async duplicate(id: string, actorId?: string): Promise<MarketingTemplate> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("Template not found.");
    return this.create({ name: `${existing.name} (Copy)`, channel: existing.channel, category: existing.category, subject: existing.subject, content: existing.content }, actorId);
  },

  async setActive(id: string, active: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("marketing_templates").update({ active }).eq("id", id);
    if (error) throw new Error("Could not update this template's status.");
  },
};
