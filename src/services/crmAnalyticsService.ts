import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DateRange } from "@/lib/models/analytics";
import type {
  CrmAnalyticsSummary,
  AgentCrmPerformance,
  PropertyLeadPerformance,
  ProjectLeadPerformance,
  CampaignLeadPerformance,
} from "@/lib/models/crm";

// Same threshold as campaignService — never compute a rate that looks
// precise but is really just 1-of-1 or 2-of-3.
const MIN_LEADS_FOR_RATES = 5;

const QUALIFIED_STATUSES = ["interested", "follow_up", "site_visit", "negotiation", "closed"];
const SITE_VISIT_STATUSES = ["site_visit", "negotiation", "closed"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeadRow = any;

async function fetchLeadsInRange(range: DateRange): Promise<LeadRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, status, priority, source, assigned_agent_id, assigned_to, property_id, property_title, project_id, project_title, campaign_id, campaigns(name), projects(name), created_at, converted_at, archived"
    )
    .gte("created_at", range.from)
    .lt("created_at", range.to);
  if (error) {
    console.error("crmAnalyticsService: fetchLeadsInRange failed:", error);
    return [];
  }
  return data ?? [];
}

export const crmAnalyticsService = {
  /** CRM Analytics overview (section 46) — every field is real, from-data
   *  only. Conversion rate and response/conversion time come back null
   *  below the minimum sample size / when no timestamps exist to compute
   *  them from, never an invented percentage. */
  async summary(range: DateRange): Promise<CrmAnalyticsSummary> {
    const leads = await fetchLeadsInRange(range);
    const total = leads.length;
    const count = (s: string) => leads.filter((l) => l.status === s).length;
    const qualified = leads.filter((l) => QUALIFIED_STATUSES.includes(l.status)).length;
    const siteVisits = leads.filter((l) => SITE_VISIT_STATUSES.includes(l.status)).length;
    const negotiations = count("negotiation");
    const converted = count("closed");
    const lost = count("lost");

    const tally = (values: string[]) => {
      const map = new Map<string, number>();
      for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
      return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    };

    // Average conversion time (created_at -> converted_at), days.
    const convertedWithDates = leads.filter((l) => l.status === "closed" && l.converted_at);
    const averageConversionTimeDays =
      convertedWithDates.length >= 3
        ? Math.round(
            (convertedWithDates.reduce(
              (sum, l) => sum + (new Date(l.converted_at).getTime() - new Date(l.created_at).getTime()),
              0
            ) /
              convertedWithDates.length /
              (1000 * 60 * 60 * 24)) *
              10
          ) / 10
        : null;

    // Average response time (created_at -> first Outgoing communication_log
    // entry) — only computed when there's enough logged, real contact
    // activity to be meaningful; skipped entirely otherwise (never guessed).
    let averageResponseTimeHours: number | null = null;
    if (leads.length > 0) {
      const supabase = await createClient();
      const { data: firstContacts } = await supabase
        .from("communication_log")
        .select("lead_id, created_at")
        .eq("direction", "Outgoing")
        .in(
          "lead_id",
          leads.map((l) => l.id)
        )
        .order("created_at", { ascending: true });
      if (firstContacts && firstContacts.length > 0) {
        const firstByLead = new Map<string, string>();
        for (const row of firstContacts) {
          if (!firstByLead.has(row.lead_id)) firstByLead.set(row.lead_id, row.created_at);
        }
        if (firstByLead.size >= 3) {
          const leadById = new Map(leads.map((l) => [l.id, l]));
          const diffsHours = [...firstByLead.entries()]
            .map(([leadId, contactedAt]) => {
              const lead = leadById.get(leadId);
              if (!lead) return null;
              return (new Date(contactedAt).getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60);
            })
            .filter((v): v is number => v !== null && v >= 0);
          if (diffsHours.length >= 3) {
            averageResponseTimeHours = Math.round((diffsHours.reduce((a, b) => a + b, 0) / diffsHours.length) * 10) / 10;
          }
        }
      }
    }

    return {
      hasEnoughData: total >= MIN_LEADS_FOR_RATES,
      totalLeads: total,
      qualifiedLeads: qualified,
      siteVisits,
      negotiations,
      converted,
      lost,
      conversionRate: total >= MIN_LEADS_FOR_RATES ? converted / total : null,
      bySource: tally(leads.map((l) => l.source ?? "other")),
      averageResponseTimeHours,
      averageConversionTimeDays,
    };
  },

  /** Per-agent breakdown (section 47) — assigned/contacted/qualified/site
   *  visits/converted/lost, plus completed follow-ups in range. */
  async agentPerformance(range: DateRange): Promise<AgentCrmPerformance[]> {
    const supabase = await createClient();
    const [leads, agentsRes, followUpsRes] = await Promise.all([
      fetchLeadsInRange(range),
      supabase.from("admin_profiles").select("id, name").in("role", ["sales_agent", "sales_manager", "admin", "super_admin"]),
      supabase
        .from("follow_ups")
        .select("assigned_agent_id")
        .eq("status", "Completed")
        .gte("created_at", range.from)
        .lt("created_at", range.to),
    ]);
    const agents = agentsRes.data ?? [];
    const followUps = followUpsRes.data ?? [];

    return agents
      .map((agent) => {
        const mine = leads.filter((l) => l.assigned_agent_id === agent.id);
        const assigned = mine.length;
        const contacted = mine.filter((l) => l.status !== "new").length;
        const qualified = mine.filter((l) => QUALIFIED_STATUSES.includes(l.status)).length;
        const siteVisits = mine.filter((l) => SITE_VISIT_STATUSES.includes(l.status)).length;
        const converted = mine.filter((l) => l.status === "closed").length;
        const lost = mine.filter((l) => l.status === "lost").length;
        const followUpsCompleted = followUps.filter((f) => f.assigned_agent_id === agent.id).length;
        return {
          agentId: agent.id,
          agentName: agent.name,
          assigned,
          contacted,
          qualified,
          siteVisits,
          converted,
          lost,
          conversionRate: assigned >= MIN_LEADS_FOR_RATES ? converted / assigned : null,
          followUpsCompleted,
        };
      })
      .filter((a) => a.assigned > 0)
      .sort((a, b) => b.assigned - a.assigned);
  },

  async propertyPerformance(range: DateRange): Promise<PropertyLeadPerformance[]> {
    const leads = await fetchLeadsInRange(range);
    const map = new Map<string, PropertyLeadPerformance>();
    for (const l of leads) {
      if (!l.property_id) continue;
      const entry = map.get(l.property_id) ?? {
        propertyId: l.property_id,
        propertyTitle: l.property_title ?? "Property",
        leads: 0,
        siteVisits: 0,
        converted: 0,
      };
      entry.leads += 1;
      if (SITE_VISIT_STATUSES.includes(l.status)) entry.siteVisits += 1;
      if (l.status === "closed") entry.converted += 1;
      map.set(l.property_id, entry);
    }
    return [...map.values()].sort((a, b) => b.leads - a.leads);
  },

  async projectPerformance(range: DateRange): Promise<ProjectLeadPerformance[]> {
    const leads = await fetchLeadsInRange(range);
    const map = new Map<string, ProjectLeadPerformance>();
    for (const l of leads) {
      if (!l.project_id) continue;
      const entry = map.get(l.project_id) ?? {
        projectId: l.project_id,
        projectName: l.projects?.name ?? l.project_title ?? "Project",
        leads: 0,
        siteVisits: 0,
        converted: 0,
      };
      entry.leads += 1;
      if (SITE_VISIT_STATUSES.includes(l.status)) entry.siteVisits += 1;
      if (l.status === "closed") entry.converted += 1;
      map.set(l.project_id, entry);
    }
    return [...map.values()].sort((a, b) => b.leads - a.leads);
  },

  async campaignPerformance(range: DateRange): Promise<CampaignLeadPerformance[]> {
    const leads = await fetchLeadsInRange(range);
    const map = new Map<string, CampaignLeadPerformance>();
    for (const l of leads) {
      if (!l.campaign_id) continue;
      const entry = map.get(l.campaign_id) ?? {
        campaignId: l.campaign_id,
        campaignName: l.campaigns?.name ?? "Campaign",
        leads: 0,
        converted: 0,
      };
      entry.leads += 1;
      if (l.status === "closed") entry.converted += 1;
      map.set(l.campaign_id, entry);
    }
    return [...map.values()].sort((a, b) => b.leads - a.leads);
  },
};
