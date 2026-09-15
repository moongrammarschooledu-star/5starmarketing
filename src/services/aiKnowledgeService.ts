import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AiKnowledgeSource } from "@/lib/models/ai";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): AiKnowledgeSource {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    sourceType: row.source_type,
    department: row.department ?? null,
    visibility: row.visibility,
    isPublished: !!row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Admin-curated knowledge the AI prefers over unverified retrieved
 *  data (spec's "KNOWLEDGE BASE" section) — distinct from support's
 *  existing customer-facing FAQ (kbService), which search_knowledge_base
 *  already covers; this is the AI-specific internal/admin layer for
 *  policy notes, do/don't guidance, and short internal references. */
export const aiKnowledgeService = {
  async listAll(): Promise<AiKnowledgeSource[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("ai_knowledge_sources").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async create(input: Pick<AiKnowledgeSource, "title" | "content" | "sourceType" | "department" | "visibility" | "isPublished">, createdBy: string): Promise<AiKnowledgeSource> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_knowledge_sources")
      .insert({
        title: input.title,
        content: input.content,
        source_type: input.sourceType,
        department: input.department,
        visibility: input.visibility,
        is_published: input.isPublished,
        created_by: createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async update(id: string, input: Partial<Pick<AiKnowledgeSource, "title" | "content" | "visibility" | "isPublished" | "department">>): Promise<void> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.content !== undefined) patch.content = input.content;
    if (input.visibility !== undefined) patch.visibility = input.visibility;
    if (input.isPublished !== undefined) patch.is_published = input.isPublished;
    if (input.department !== undefined) patch.department = input.department;
    const { error } = await supabase.from("ai_knowledge_sources").update(patch).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("ai_knowledge_sources").delete().eq("id", id);
    if (error) throw error;
  },
};
