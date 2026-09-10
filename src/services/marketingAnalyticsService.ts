import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DateRange } from "@/lib/models/analytics";
import type { MarketingEventType, SourceReportRow, MarketingFunnel } from "@/lib/models/campaign";

const KNOWN_SOURCES = ["Facebook", "Instagram", "TikTok", "Google", "YouTube", "WhatsApp", "Website", "Direct", "Other"];

/** Maps whatever raw utm_source string a visitor arrived with onto the
 *  fixed reporting list — never invents a new bucket per ad-hoc string.
 *  No attribution at all (a lead with no first-touch source) is "Direct",
 *  distinct from an explicit utm_source=website link. */
export function normalizeSource(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "Direct";
  const s = raw.trim().toLowerCase();
  if (s.includes("facebook") || s === "fb") return "Facebook";
  if (s.includes("instagram") || s === "ig") return "Instagram";
  if (s.includes("tiktok")) return "TikTok";
  if (s.includes("google")) return "Google";
  if (s.includes("youtube")) return "YouTube";
  if (s.includes("whatsapp")) return "WhatsApp";
  if (s.includes("website")) return "Website";
  return "Other";
}

export interface MarketingDashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalLeads: number;
  leadsThisMonth: number;
  qualifiedLeads: number;
  siteVisits: number;
  closedLeads: number;
  conversionRate: number | null;
}

export interface TopCampaignRow {
  campaignId: string;
  name: string;
  leads: number;
  siteVisits: number;
  closedLeads: number;
}

export const marketingAnalyticsService = {
  /** Best-effort — never blocks the visitor action it's attached to. No
   *  personal data of any kind, just what happened/where/which campaign. */
  async recordEvent(
    eventType: MarketingEventType,
    opts: {
      propertyId?: string;
      projectId?: string;
      sessionId?: string;
      landingPage?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmContent?: string;
      utmTerm?: string;
    }
  ): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from("campaign_events").insert({
        event_type: eventType,
        property_id: opts.propertyId || null,
        project_id: opts.projectId || null,
        session_id: opts.sessionId || null,
        landing_page: opts.landingPage || null,
        utm_source: opts.utmSource || null,
        utm_medium: opts.utmMedium || null,
        utm_campaign: opts.utmCampaign || null,
        utm_content: opts.utmContent || null,
        utm_term: opts.utmTerm || null,
      });
    } catch (e) {
      console.error("marketingAnalyticsService.recordEvent failed:", e);
    }
  },

  /** Marketing Command Center top stats — all real Supabase data. */
  async dashboardStats(): Promise<MarketingDashboardStats> {
    const supabase = await createClient();
    const [{ data: campaigns, error: cErr }, { data: leads, error: lErr }] = await Promise.all([
      supabase.from("campaigns").select("status"),
      supabase.from("leads").select("status, created_at, campaign_id"),
    ]);
    if (cErr || lErr) {
      console.error("marketingAnalyticsService.dashboardStats failed:", cErr || lErr);
      throw new Error("Could not load marketing dashboard stats.");
    }

    const c = campaigns ?? [];
    const l = leads ?? [];
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    const qualified = l.filter((r) => ["interested", "follow_up", "site_visit", "negotiation", "closed"].includes(r.status)).length;
    const siteVisits = l.filter((r) => ["site_visit", "negotiation", "closed"].includes(r.status)).length;
    const closed = l.filter((r) => r.status === "closed").length;

    return {
      totalCampaigns: c.length,
      activeCampaigns: c.filter((r) => r.status === "Active").length,
      totalLeads: l.length,
      leadsThisMonth: l.filter((r) => r.created_at >= monthStart).length,
      qualifiedLeads: qualified,
      siteVisits,
      closedLeads: closed,
      conversionRate: l.length > 0 ? closed / l.length : null,
    };
  },

  /** Top Campaigns leaderboard (Marketing Command Center section). */
  async topCampaigns(limit = 5): Promise<TopCampaignRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("leads").select("campaign_id, status, campaigns(name)").not("campaign_id", "is", null);
    if (error) {
      console.error("marketingAnalyticsService.topCampaigns failed:", error);
      return [];
    }
    const map = new Map<string, TopCampaignRow>();
    for (const row of data ?? []) {
      const id = row.campaign_id as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const name = (row.campaigns as any)?.name ?? "Unknown Campaign";
      const entry = map.get(id) ?? { campaignId: id, name, leads: 0, siteVisits: 0, closedLeads: 0 };
      entry.leads += 1;
      if (["site_visit", "negotiation", "closed"].includes(row.status)) entry.siteVisits += 1;
      if (row.status === "closed") entry.closedLeads += 1;
      map.set(id, entry);
    }
    return [...map.values()].sort((a, b) => b.leads - a.leads).slice(0, limit);
  },

  /** Lead Source Report (/admin/marketing/sources) — every fixed source
   *  bucket, even ones with zero activity (shown as real zeroes, never
   *  omitted or invented). Source attribution uses FIRST-touch (the
   *  channel that originally brought the visitor in); campaign
   *  attribution elsewhere in this system uses last-touch — see the
   *  STEP 15 report for why these are deliberately different. */
  async sourcesReport(range?: DateRange): Promise<SourceReportRow[]> {
    const supabase = await createClient();
    let leadsQuery = supabase.from("leads").select("first_touch_source, status");
    if (range) leadsQuery = leadsQuery.gte("created_at", range.from).lt("created_at", range.to);
    let eventsQuery = supabase.from("campaign_events").select("utm_source, session_id").not("session_id", "is", null);
    if (range) eventsQuery = eventsQuery.gte("created_at", range.from).lt("created_at", range.to);

    const [{ data: leadRows, error: lErr }, { data: eventRows, error: eErr }] = await Promise.all([leadsQuery, eventsQuery]);
    if (lErr || eErr) {
      console.error("marketingAnalyticsService.sourcesReport failed:", lErr || eErr);
      return [];
    }

    const visitorsBySource = new Map<string, Set<string>>();
    for (const row of eventRows ?? []) {
      const source = normalizeSource(row.utm_source);
      if (!visitorsBySource.has(source)) visitorsBySource.set(source, new Set());
      if (row.session_id) visitorsBySource.get(source)!.add(row.session_id);
    }

    const rows: Record<string, { leads: number; qualified: number; siteVisits: number; closed: number }> = {};
    for (const source of KNOWN_SOURCES) rows[source] = { leads: 0, qualified: 0, siteVisits: 0, closed: 0 };

    for (const l of leadRows ?? []) {
      const source = normalizeSource(l.first_touch_source);
      const bucket = rows[source] ?? (rows[source] = { leads: 0, qualified: 0, siteVisits: 0, closed: 0 });
      bucket.leads += 1;
      if (["interested", "follow_up", "site_visit", "negotiation", "closed"].includes(l.status)) bucket.qualified += 1;
      if (["site_visit", "negotiation", "closed"].includes(l.status)) bucket.siteVisits += 1;
      if (l.status === "closed") bucket.closed += 1;
    }

    return KNOWN_SOURCES.map((source) => {
      const b = rows[source];
      return {
        source,
        visitors: visitorsBySource.get(source)?.size ?? 0,
        leads: b.leads,
        qualifiedLeads: b.qualified,
        siteVisits: b.siteVisits,
        closedLeads: b.closed,
        conversionRate: b.leads > 0 ? b.closed / b.leads : null,
      };
    });
  },

  /** UTM Performance report — grouped by the exact (source, medium,
   *  campaign) combination a lead's first touch carried, distinct from
   *  the normalized Lead Source Report above. Leads with no UTM data at
   *  all are grouped under "(no utm data)". */
  async utmPerformance(range?: DateRange): Promise<{ source: string; medium: string; campaign: string; leads: number; closedLeads: number }[]> {
    const supabase = await createClient();
    let query = supabase.from("leads").select("first_touch_source, first_touch_medium, first_touch_campaign, status");
    if (range) query = query.gte("created_at", range.from).lt("created_at", range.to);
    const { data, error } = await query;
    if (error) {
      console.error("marketingAnalyticsService.utmPerformance failed:", error);
      return [];
    }
    const map = new Map<string, { source: string; medium: string; campaign: string; leads: number; closedLeads: number }>();
    for (const row of data ?? []) {
      const source = row.first_touch_source || "(no utm data)";
      const medium = row.first_touch_medium || "(no utm data)";
      const campaign = row.first_touch_campaign || "(no utm data)";
      const key = `${source}|${medium}|${campaign}`;
      const entry = map.get(key) ?? { source, medium, campaign, leads: 0, closedLeads: 0 };
      entry.leads += 1;
      if (row.status === "closed") entry.closedLeads += 1;
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => b.leads - a.leads);
  },

  /** Platform Performance — campaigns grouped by platform, with their
   *  combined lead totals. */
  async platformPerformance(): Promise<{ platform: string; campaigns: number; leads: number; closedLeads: number }[]> {
    const supabase = await createClient();
    const [{ data: campaigns, error: cErr }, { data: leads, error: lErr }] = await Promise.all([
      supabase.from("campaigns").select("id, platform"),
      supabase.from("leads").select("campaign_id, status").not("campaign_id", "is", null),
    ]);
    if (cErr || lErr) {
      console.error("marketingAnalyticsService.platformPerformance failed:", cErr || lErr);
      return [];
    }
    const platformByCampaign = new Map((campaigns ?? []).map((c) => [c.id, c.platform]));
    const map = new Map<string, { platform: string; campaigns: number; leads: number; closedLeads: number }>();
    for (const c of campaigns ?? []) {
      const entry = map.get(c.platform) ?? { platform: c.platform, campaigns: 0, leads: 0, closedLeads: 0 };
      entry.campaigns += 1;
      map.set(c.platform, entry);
    }
    for (const l of leads ?? []) {
      const platform = platformByCampaign.get(l.campaign_id as string);
      if (!platform) continue;
      const entry = map.get(platform) ?? { platform, campaigns: 0, leads: 0, closedLeads: 0 };
      entry.leads += 1;
      if (l.status === "closed") entry.closedLeads += 1;
      map.set(platform, entry);
    }
    return [...map.values()].sort((a, b) => b.leads - a.leads);
  },

  /** Conversion Funnel — every stage from real Supabase data. Nothing is
   *  invented; a stage this deployment can't track would show up in
   *  `untracked` (currently every stage here is tracked). */
  async funnel(range: DateRange): Promise<MarketingFunnel> {
    const supabase = await createClient();
    const [{ data: events, error: eErr }, { data: views, error: vErr }, { data: leads, error: lErr }] = await Promise.all([
      supabase.from("campaign_events").select("session_id").not("session_id", "is", null).gte("created_at", range.from).lt("created_at", range.to),
      supabase.from("property_views").select("id").gte("created_at", range.from).lt("created_at", range.to),
      supabase.from("leads").select("status").gte("created_at", range.from).lt("created_at", range.to),
    ]);
    if (eErr || vErr || lErr) {
      console.error("marketingAnalyticsService.funnel failed:", eErr || vErr || lErr);
      throw new Error("Could not load the marketing funnel.");
    }

    const l = leads ?? [];
    return {
      visitors: new Set((events ?? []).map((r) => r.session_id)).size,
      propertyViews: (views ?? []).length,
      inquiries: l.length,
      qualifiedLeads: l.filter((r) => ["interested", "follow_up", "site_visit", "negotiation", "closed"].includes(r.status)).length,
      siteVisits: l.filter((r) => ["site_visit", "negotiation", "closed"].includes(r.status)).length,
      negotiations: l.filter((r) => ["negotiation", "closed"].includes(r.status)).length,
      closedLeads: l.filter((r) => r.status === "closed").length,
      untracked: [],
    };
  },
};
