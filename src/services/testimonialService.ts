import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PublicTestimonial, PublicTestimonialInput } from "@/lib/models/content";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): PublicTestimonial {
  return {
    id: row.id,
    customerDisplayName: row.customer_display_name,
    review: row.review,
    rating: row.rating ?? undefined,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    approved: row.approved,
    approvedAt: row.approved_at ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    createdAt: row.created_at,
  };
}

const SELECT_WITH_JOINS = "*, properties(title)";

export const testimonialService = {
  async listApproved(limit = 12): Promise<PublicTestimonial[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("public_testimonials")
      .select(SELECT_WITH_JOINS)
      .eq("approved", true)
      .order("approved_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("testimonialService.listApproved failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async listAll(): Promise<PublicTestimonial[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("public_testimonials").select(SELECT_WITH_JOINS).order("created_at", { ascending: false });
    if (error) {
      console.error("testimonialService.listAll failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  /** Admin-entered only — this codebase deliberately has no public
   *  self-submission form for testimonials (section 36 requires
   *  approval before publication, and there's no verified-purchase
   *  system to gate a public form against fake submissions). */
  async create(input: PublicTestimonialInput): Promise<PublicTestimonial> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("public_testimonials")
      .insert({
        customer_display_name: input.customerDisplayName,
        review: input.review,
        rating: input.rating ?? null,
        property_id: input.propertyId || null,
      })
      .select(SELECT_WITH_JOINS)
      .single();
    if (error) {
      console.error("testimonialService.create failed:", error);
      throw new Error("Could not add this testimonial.");
    }
    return mapRow(data);
  },

  async setApproved(id: string, approved: boolean, approvedBy: string): Promise<void> {
    const supabase = await createClient();
    await supabase
      .from("public_testimonials")
      .update({ approved, approved_at: approved ? new Date().toISOString() : null, approved_by: approved ? approvedBy : null })
      .eq("id", id);
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    await supabase.from("public_testimonials").delete().eq("id", id);
  },
};
