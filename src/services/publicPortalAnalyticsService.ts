import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface PublicPortalAnalytics {
  sinceDays: number;
  propertyViews: number;
  topViewedProperties: { propertyId: string; title: string; slug: string; views: number; inquiries: number }[];
  whatsappClicks: number;
  phoneClicks: number;
  contactFormSubmits: number;
  leadsBySource: { source: string; count: number }[];
  siteVisitRequests: number;
  blogPostsPublished: number;
  activeLandingPages: number;
}

/** Real numbers only, assembled from tables that already exist
 *  (property_views, website_events, search_events via property_
 *  popularity, leads, appointments) — no new event tables were needed
 *  to build this (see the STEP 32 migration's design notes). */
export const publicPortalAnalyticsService = {
  async summary(days = 30): Promise<PublicPortalAnalytics> {
    const supabase = await createClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [viewsRes, websiteEventsRes, leadsRes, appointmentsRes, popularityRes, blogRes, landingRes] = await Promise.all([
      supabase.from("property_views").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("website_events").select("event_type").gte("created_at", since),
      supabase.from("leads").select("source").gte("created_at", since),
      supabase.from("appointments").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabase
        .from("property_popularity")
        .select("property_id, view_count, inquiry_count, properties(title, slug)")
        .order("view_count", { ascending: false })
        .limit(10),
      supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED"),
      supabase.from("public_landing_pages").select("id", { count: "exact", head: true }).eq("active", true),
    ]);

    let whatsappClicks = 0;
    let phoneClicks = 0;
    let contactFormSubmits = 0;
    for (const row of websiteEventsRes.data ?? []) {
      if (row.event_type === "whatsapp_click") whatsappClicks += 1;
      else if (row.event_type === "phone_click") phoneClicks += 1;
      else if (row.event_type === "contact_form_submit") contactFormSubmits += 1;
    }

    const sourceCounts = new Map<string, number>();
    for (const row of leadsRes.data ?? []) {
      const source = row.source ?? "Unknown";
      sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
    }
    const leadsBySource = [...sourceCounts.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topViewedProperties = (popularityRes.data ?? []).map((row: any) => ({
      propertyId: row.property_id,
      title: row.properties?.title ?? "Untitled",
      slug: row.properties?.slug ?? "",
      views: row.view_count ?? 0,
      inquiries: row.inquiry_count ?? 0,
    }));

    return {
      sinceDays: days,
      propertyViews: viewsRes.count ?? 0,
      topViewedProperties,
      whatsappClicks,
      phoneClicks,
      contactFormSubmits,
      leadsBySource,
      siteVisitRequests: appointmentsRes.count ?? 0,
      blogPostsPublished: blogRes.count ?? 0,
      activeLandingPages: landingRes.count ?? 0,
    };
  },
};
