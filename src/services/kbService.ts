import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SupportKbArticle, SupportKbArticleInput } from "@/lib/models/support";

const SELECT = "*, support_categories(label), author:admin_profiles!support_kb_articles_author_id_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): SupportKbArticle {
  return {
    id: row.id,
    title: row.title,
    categoryCode: row.category_code ?? undefined,
    categoryLabel: row.support_categories?.label ?? undefined,
    question: row.question,
    answer: row.answer,
    keywords: row.keywords ?? [],
    propertyId: row.property_id ?? undefined,
    projectId: row.project_id ?? undefined,
    published: !!row.published,
    visibility: row.visibility,
    authorId: row.author_id ?? undefined,
    authorName: row.author?.name ?? undefined,
    helpfulCount: row.helpful_count,
    notHelpfulCount: row.not_helpful_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const kbService = {
  async listAdmin(): Promise<SupportKbArticle[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("support_kb_articles").select(SELECT).order("created_at", { ascending: false });
    if (error) {
      console.error("kbService.listAdmin failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  /** Public/customer-facing — only ever published articles, optionally
   *  full-text-searched via the question column's trigram index. */
  async listPublished(q?: string, categoryCode?: string): Promise<SupportKbArticle[]> {
    const supabase = await createClient();
    let query = supabase.from("support_kb_articles").select(SELECT).eq("published", true).order("helpful_count", { ascending: false });
    if (categoryCode) query = query.eq("category_code", categoryCode);
    if (q) {
      const term = q.replace(/[%_]/g, "\\$&");
      query = query.or(`question.ilike.%${term}%,answer.ilike.%${term}%,title.ilike.%${term}%`);
    }
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<SupportKbArticle | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("support_kb_articles").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: SupportKbArticleInput, authorId: string): Promise<SupportKbArticle> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("support_kb_articles")
      .insert({
        title: input.title,
        category_code: input.categoryCode || null,
        question: input.question,
        answer: input.answer,
        keywords: input.keywords ?? [],
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        published: input.published ?? false,
        visibility: input.visibility ?? "PUBLIC",
        author_id: authorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("kbService.create failed:", error);
      throw new Error("Could not create this article.");
    }
    return mapRow(data);
  },

  async update(id: string, input: Partial<SupportKbArticleInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.title !== undefined) row.title = input.title;
    if (input.categoryCode !== undefined) row.category_code = input.categoryCode || null;
    if (input.question !== undefined) row.question = input.question;
    if (input.answer !== undefined) row.answer = input.answer;
    if (input.keywords !== undefined) row.keywords = input.keywords;
    if (input.propertyId !== undefined) row.property_id = input.propertyId || null;
    if (input.projectId !== undefined) row.project_id = input.projectId || null;
    if (input.published !== undefined) row.published = input.published;
    if (input.visibility !== undefined) row.visibility = input.visibility;
    const { error } = await supabase.from("support_kb_articles").update(row).eq("id", id);
    if (error) throw new Error("Could not update this article.");
  },

  /** Converts a resolved ticket's Q&A into a reusable KB article
   *  (section 17's "convert FAQs into articles") — never auto-
   *  published, an admin still reviews before it goes live. */
  async createFromTicket(title: string, question: string, answer: string, categoryCode: string | undefined, authorId: string): Promise<SupportKbArticle> {
    return this.create({ title, question, answer, categoryCode, published: false, visibility: "PUBLIC" }, authorId);
  },

  async recordFeedback(articleId: string, helpful: boolean, customerId?: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("support_kb_feedback").insert({ article_id: articleId, helpful, customer_id: customerId || null });
    if (error) throw new Error("Could not record your feedback.");
  },
};
