import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BlogPost, BlogPostInput } from "@/lib/models/content";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? undefined,
    content: row.content,
    featuredImage: row.featured_image ?? undefined,
    authorName: row.author_name,
    category: row.category,
    tags: row.tags ?? [],
    seoTitle: row.seo_title ?? undefined,
    seoDescription: row.seo_description ?? undefined,
    status: row.status,
    publishedAt: row.published_at ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const blogService = {
  async listPublished(category?: string, limit = 20): Promise<BlogPost[]> {
    const supabase = await createClient();
    let query = supabase
      .from("blog_posts")
      .select("*")
      .eq("status", "PUBLISHED")
      .order("published_at", { ascending: false })
      .limit(limit);
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) {
      console.error("blogService.listPublished failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async listAll(): Promise<BlogPost[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("blogService.listAll failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getBySlug(slug: string): Promise<BlogPost | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async getById(id: string): Promise<BlogPost | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async listRelated(category: string, excludeId: string, limit = 3): Promise<BlogPost[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("status", "PUBLISHED")
      .eq("category", category)
      .neq("id", excludeId)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async create(input: BlogPostInput, createdBy: string): Promise<BlogPost> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .insert({
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt || null,
        content: input.content,
        featured_image: input.featuredImage || null,
        author_name: input.authorName,
        category: input.category,
        tags: input.tags,
        seo_title: input.seoTitle || null,
        seo_description: input.seoDescription || null,
        status: input.status,
        published_at: input.status === "PUBLISHED" ? (input.publishedAt ?? new Date().toISOString()) : null,
        created_by: createdBy,
      })
      .select("*")
      .single();
    if (error) {
      console.error("blogService.create failed:", error);
      throw new Error(error.code === "23505" ? "That slug is already used by another post." : "Could not create this post.");
    }
    return mapRow(data);
  },

  async update(id: string, input: Partial<BlogPostInput>): Promise<BlogPost | undefined> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = {};
    if (input.slug !== undefined) patch.slug = input.slug;
    if (input.title !== undefined) patch.title = input.title;
    if (input.excerpt !== undefined) patch.excerpt = input.excerpt || null;
    if (input.content !== undefined) patch.content = input.content;
    if (input.featuredImage !== undefined) patch.featured_image = input.featuredImage || null;
    if (input.authorName !== undefined) patch.author_name = input.authorName;
    if (input.category !== undefined) patch.category = input.category;
    if (input.tags !== undefined) patch.tags = input.tags;
    if (input.seoTitle !== undefined) patch.seo_title = input.seoTitle || null;
    if (input.seoDescription !== undefined) patch.seo_description = input.seoDescription || null;
    if (input.status !== undefined) {
      patch.status = input.status;
      if (input.status === "PUBLISHED") {
        const existing = await this.getById(id);
        if (!existing?.publishedAt) patch.published_at = new Date().toISOString();
      }
    }
    const { data, error } = await supabase.from("blog_posts").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) {
      console.error("blogService.update failed:", error);
      throw new Error(error.code === "23505" ? "That slug is already used by another post." : "Could not update this post.");
    }
    return data ? mapRow(data) : undefined;
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    await supabase.from("blog_posts").delete().eq("id", id);
  },
};
