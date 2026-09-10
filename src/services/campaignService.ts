import "server-only";
import { createClient } from "@/lib/supabase/server";
import { site, whatsappUrlFor } from "@/lib/site";
import type {
  Campaign,
  CampaignInput,
  CampaignStatus,
  CampaignPerformance,
  CampaignCostAnalytics,
  CampaignROI,
} from "@/lib/models/campaign";
import type { DateRange } from "@/lib/models/analytics";

const MIN_LEADS_FOR_RATES = 5;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Campaign {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    campaignType: row.campaign_type,
    status: row.status,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    plannedBudget: row.planned_budget ?? undefined,
    actualSpend: row.actual_spend ?? undefined,
    revenueGenerated: row.revenue_generated ?? undefined,
    targetAudience: row.target_audience ?? undefined,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    propertySlug: row.properties?.slug ?? undefined,
    projectId: row.project_id ?? undefined,
    projectTitle: row.projects?.name ?? undefined,
    projectSlug: row.projects?.slug ?? undefined,
    landingPage: row.landing_page ?? undefined,
    utmSource: row.utm_source ?? undefined,
    utmMedium: row.utm_medium ?? undefined,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content ?? undefined,
    utmTerm: row.utm_term ?? undefined,
    description: row.description ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdByName: row.admin_profiles?.name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_WITH_JOINS = "*, properties(title, slug), projects(name, slug), admin_profiles(name)";

/** Resolves the real, clickable landing page path for a campaign —
 *  prefers an explicit custom landing page, then falls back to the
 *  linked property/project's own page, then the homepage. Never a
 *  placeholder. */
export function resolveLandingPagePath(campaign: Campaign): string {
  if (campaign.landingPage) return campaign.landingPage;
  if (campaign.propertySlug) return `/properties/${campaign.propertySlug}`;
  if (campaign.projectSlug) return `/projects/${campaign.projectSlug}`;
  return "/";
}

/** Full, shareable campaign URL with UTM params attached — used for the
 *  QR code and the "copy campaign link" action. */
export function buildCampaignUrl(campaign: Campaign, landingPath: string): string {
  const url = new URL(landingPath, site.url);
  if (campaign.utmSource) url.searchParams.set("utm_source", campaign.utmSource);
  url.searchParams.set("utm_medium", campaign.utmMedium || "campaign");
  url.searchParams.set("utm_campaign", campaign.utmCampaign);
  if (campaign.utmContent) url.searchParams.set("utm_content", campaign.utmContent);
  if (campaign.utmTerm) url.searchParams.set("utm_term", campaign.utmTerm);
  return url.toString();
}

/** Campaign-specific WhatsApp deep link (section 23) — the click itself
 *  is tracked by the caller before opening this URL (see
 *  CampaignAssets.tsx), same as every other WhatsApp link in the app. */
export function buildCampaignWhatsAppUrl(campaign: Campaign, whatsappNumber: string): string {
  return whatsappUrlFor(
    whatsappNumber,
    `Assalam-o-Alaikum, I am interested in the property advertised in the ${campaign.name} campaign.`
  );
}

/** Offline/QR-code campaign URL (section 22) — always utm_medium=qr
 *  regardless of the campaign's own utm_medium, so QR scans are
 *  distinguishable from the campaign's online traffic in reports. */
export function buildCampaignQrUrl(campaign: Campaign, landingPath: string): string {
  const url = new URL(landingPath, site.url);
  url.searchParams.set("utm_source", campaign.utmSource || "offline");
  url.searchParams.set("utm_medium", "qr");
  url.searchParams.set("utm_campaign", campaign.utmCampaign);
  return url.toString();
}

export const campaignService = {
  async create(input: CampaignInput, createdBy?: string): Promise<Campaign> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        name: input.name,
        platform: input.platform,
        campaign_type: input.campaignType,
        status: input.status ?? "Draft",
        start_date: input.startDate || null,
        end_date: input.endDate || null,
        planned_budget: input.plannedBudget ?? null,
        actual_spend: input.actualSpend ?? null,
        revenue_generated: input.revenueGenerated ?? null,
        target_audience: input.targetAudience || null,
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        landing_page: input.landingPage || null,
        utm_source: input.utmSource || null,
        utm_medium: input.utmMedium || null,
        utm_campaign: input.utmCampaign,
        utm_content: input.utmContent || null,
        utm_term: input.utmTerm || null,
        description: input.description || null,
        created_by: createdBy || null,
      })
      .select(SELECT_WITH_JOINS)
      .single();
    if (error) {
      console.error("campaignService.create failed:", error);
      if (error.code === "23505") {
        throw new Error("A campaign with this UTM campaign slug already exists. Choose a different one.");
      }
      throw new Error("Could not create this campaign.");
    }
    return mapRow(data);
  },

  async update(id: string, input: Partial<CampaignInput>): Promise<Campaign | undefined> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: Record<string, any> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.platform !== undefined) patch.platform = input.platform;
    if (input.campaignType !== undefined) patch.campaign_type = input.campaignType;
    if (input.status !== undefined) patch.status = input.status;
    if (input.startDate !== undefined) patch.start_date = input.startDate || null;
    if (input.endDate !== undefined) patch.end_date = input.endDate || null;
    if (input.plannedBudget !== undefined) patch.planned_budget = input.plannedBudget ?? null;
    if (input.actualSpend !== undefined) patch.actual_spend = input.actualSpend ?? null;
    if (input.revenueGenerated !== undefined) patch.revenue_generated = input.revenueGenerated ?? null;
    if (input.targetAudience !== undefined) patch.target_audience = input.targetAudience || null;
    if (input.propertyId !== undefined) patch.property_id = input.propertyId || null;
    if (input.projectId !== undefined) patch.project_id = input.projectId || null;
    if (input.landingPage !== undefined) patch.landing_page = input.landingPage || null;
    if (input.utmSource !== undefined) patch.utm_source = input.utmSource || null;
    if (input.utmMedium !== undefined) patch.utm_medium = input.utmMedium || null;
    if (input.utmCampaign !== undefined) patch.utm_campaign = input.utmCampaign;
    if (input.utmContent !== undefined) patch.utm_content = input.utmContent || null;
    if (input.utmTerm !== undefined) patch.utm_term = input.utmTerm || null;
    if (input.description !== undefined) patch.description = input.description || null;

    const { data, error } = await supabase.from("campaigns").update(patch).eq("id", id).select(SELECT_WITH_JOINS).maybeSingle();
    if (error) {
      console.error("campaignService.update failed:", error);
      if (error.code === "23505") {
        throw new Error("A campaign with this UTM campaign slug already exists. Choose a different one.");
      }
      throw new Error("Could not update this campaign.");
    }
    return data ? mapRow(data) : undefined;
  },

  async setStatus(id: string, status: CampaignStatus): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
    if (error) throw new Error("Could not update this campaign's status.");
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) throw new Error("Could not delete this campaign.");
  },

  async getById(id: string): Promise<Campaign | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("campaigns").select(SELECT_WITH_JOINS).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async list(filters?: { status?: CampaignStatus; platform?: string; search?: string }): Promise<Campaign[]> {
    const supabase = await createClient();
    let query = supabase.from("campaigns").select(SELECT_WITH_JOINS).order("created_at", { ascending: false });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.platform) query = query.eq("platform", filters.platform);
    const { data, error } = await query;
    if (error) {
      console.error("campaignService.list failed:", error);
      return [];
    }
    let rows = (data ?? []).map(mapRow);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter((c) => c.name.toLowerCase().includes(q) || c.utmCampaign.toLowerCase().includes(q));
    }
    return rows;
  },

  /** Campaigns whose date range overlaps "now" or is upcoming — for the
   *  marketing calendar. */
  async listForCalendar(): Promise<Campaign[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("campaigns").select(SELECT_WITH_JOINS).order("start_date", { ascending: true, nullsFirst: false });
    if (error) {
      console.error("campaignService.listForCalendar failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  /** Real, from-data performance for one campaign. Every count comes
   *  straight from `leads`/`campaign_events` filtered to this campaign;
   *  rate fields come back null ("No sufficient data available.") below
   *  a minimum sample size, never a computed-but-meaningless 0%. */
  async performance(id: string, range?: DateRange): Promise<CampaignPerformance> {
    const supabase = await createClient();

    let leadsQuery = supabase.from("leads").select("status").eq("campaign_id", id);
    if (range) leadsQuery = leadsQuery.gte("created_at", range.from).lt("created_at", range.to);
    let eventsQuery = supabase.from("campaign_events").select("session_id").eq("campaign_id", id).not("session_id", "is", null);
    if (range) eventsQuery = eventsQuery.gte("created_at", range.from).lt("created_at", range.to);

    const [{ data: leadRows, error: leadsError }, { data: eventRows, error: eventsError }] = await Promise.all([leadsQuery, eventsQuery]);
    if (leadsError) console.error("campaignService.performance (leads) failed:", leadsError);
    if (eventsError) console.error("campaignService.performance (events) failed:", eventsError);

    const leads = leadRows ?? [];
    const visitors = new Set((eventRows ?? []).map((r) => r.session_id)).size;
    const total = leads.length;

    const qualified = leads.filter((l) => ["interested", "follow_up", "site_visit", "negotiation", "closed"].includes(l.status)).length;
    const siteVisits = leads.filter((l) => ["site_visit", "negotiation", "closed"].includes(l.status)).length;
    const closed = leads.filter((l) => l.status === "closed").length;

    if (total < MIN_LEADS_FOR_RATES) {
      return {
        hasEnoughData: false,
        visitors,
        leads: total,
        qualifiedLeads: qualified,
        siteVisits,
        closedLeads: closed,
        leadConversionRate: null,
        qualifiedLeadRate: null,
        siteVisitRate: null,
        closedLeadRate: null,
      };
    }

    return {
      hasEnoughData: true,
      visitors,
      leads: total,
      qualifiedLeads: qualified,
      siteVisits,
      closedLeads: closed,
      leadConversionRate: closed / total,
      qualifiedLeadRate: qualified / total,
      siteVisitRate: siteVisits / total,
      closedLeadRate: qualified > 0 ? closed / qualified : null,
    };
  },

  /** Cost Per Lead / Qualified Lead / Site Visit / Closed Lead. Every
   *  field comes back null ("Not available") rather than dividing by
   *  zero or guessing when spend isn't entered. */
  async cost(id: string, performance?: CampaignPerformance): Promise<CampaignCostAnalytics> {
    const campaign = await this.getById(id);
    const perf = performance ?? (await this.performance(id));
    const spend = campaign?.actualSpend;
    const budget = campaign?.plannedBudget;

    const divide = (count: number) => (spend && spend > 0 && count > 0 ? spend / count : null);

    const remaining = budget !== undefined && spend !== undefined ? budget - spend : null;
    const overBudget = budget !== undefined && spend !== undefined && spend > budget;

    return {
      costPerLead: divide(perf.leads),
      costPerQualifiedLead: divide(perf.qualifiedLeads),
      costPerSiteVisit: divide(perf.siteVisits),
      costPerClosedLead: divide(perf.closedLeads),
      budget,
      spent: spend,
      remaining,
      overBudget,
    };
  },

  /** Only ever calculated from real, admin-entered revenue — never
   *  estimated from a property's asking price, and never a guaranteed
   *  figure. */
  async roi(id: string): Promise<CampaignROI> {
    const campaign = await this.getById(id);
    const spend = campaign?.actualSpend;
    const revenue = campaign?.revenueGenerated;
    if (!spend || spend <= 0 || revenue === undefined) {
      return { roiPercent: null, spend, revenue };
    }
    return { roiPercent: ((revenue - spend) / spend) * 100, spend, revenue };
  },
};
