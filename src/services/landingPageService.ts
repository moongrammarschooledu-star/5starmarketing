import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PublicLandingPage, PublicLandingPageInput } from "@/lib/models/content";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): PublicLandingPage {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    heroImage: row.hero_image ?? undefined,
    description: row.description,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    propertySlug: row.properties?.slug ?? undefined,
    projectId: row.project_id ?? undefined,
    projectName: row.projects?.name ?? undefined,
    projectSlug: row.projects?.slug ?? undefined,
    ctaLabel: row.cta_label,
    faqItems: Array.isArray(row.faq_items) ? row.faq_items : [],
    seoTitle: row.seo_title ?? undefined,
    seoDescription: row.seo_description ?? undefined,
    ogImage: row.og_image ?? undefined,
    campaignSource: row.campaign_source ?? undefined,
    campaignMedium: row.campaign_medium ?? undefined,
    campaignName: row.campaign_name ?? undefined,
    active: row.active,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_WITH_JOINS = "*, properties(title, slug), projects(name, slug)";

export const landingPageService = {
  async listAll(): Promise<PublicLandingPage[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("public_landing_pages").select(SELECT_WITH_JOINS).order("created_at", { ascending: false });
    if (error) {
      console.error("landingPageService.listAll failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getBySlug(slug: string): Promise<PublicLandingPage | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("public_landing_pages").select(SELECT_WITH_JOINS).eq("slug", slug).eq("active", true).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async getById(id: string): Promise<PublicLandingPage | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("public_landing_pages").select(SELECT_WITH_JOINS).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: PublicLandingPageInput, createdBy: string): Promise<PublicLandingPage> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("public_landing_pages")
      .insert({
        slug: input.slug,
        title: input.title,
        hero_image: input.heroImage || null,
        description: input.description,
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        cta_label: input.ctaLabel,
        faq_items: input.faqItems,
        seo_title: input.seoTitle || null,
        seo_description: input.seoDescription || null,
        og_image: input.ogImage || null,
        campaign_source: input.campaignSource || null,
        campaign_medium: input.campaignMedium || null,
        campaign_name: input.campaignName || null,
        active: input.active,
        created_by: createdBy,
      })
      .select(SELECT_WITH_JOINS)
      .single();
    if (error) {
      console.error("landingPageService.create failed:", error);
      throw new Error(error.code === "23505" ? "That slug is already used by another landing page." : "Could not create this landing page.");
    }
    return mapRow(data);
  },

  async update(id: string, input: Partial<PublicLandingPageInput>): Promise<PublicLandingPage | undefined> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = {};
    if (input.slug !== undefined) patch.slug = input.slug;
    if (input.title !== undefined) patch.title = input.title;
    if (input.heroImage !== undefined) patch.hero_image = input.heroImage || null;
    if (input.description !== undefined) patch.description = input.description;
    if (input.propertyId !== undefined) patch.property_id = input.propertyId || null;
    if (input.projectId !== undefined) patch.project_id = input.projectId || null;
    if (input.ctaLabel !== undefined) patch.cta_label = input.ctaLabel;
    if (input.faqItems !== undefined) patch.faq_items = input.faqItems;
    if (input.seoTitle !== undefined) patch.seo_title = input.seoTitle || null;
    if (input.seoDescription !== undefined) patch.seo_description = input.seoDescription || null;
    if (input.ogImage !== undefined) patch.og_image = input.ogImage || null;
    if (input.campaignSource !== undefined) patch.campaign_source = input.campaignSource || null;
    if (input.campaignMedium !== undefined) patch.campaign_medium = input.campaignMedium || null;
    if (input.campaignName !== undefined) patch.campaign_name = input.campaignName || null;
    if (input.active !== undefined) patch.active = input.active;
    const { data, error } = await supabase.from("public_landing_pages").update(patch).eq("id", id).select(SELECT_WITH_JOINS).maybeSingle();
    if (error) {
      console.error("landingPageService.update failed:", error);
      throw new Error(error.code === "23505" ? "That slug is already used by another landing page." : "Could not update this landing page.");
    }
    return data ? mapRow(data) : undefined;
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    await supabase.from("public_landing_pages").delete().eq("id", id);
  },
};
