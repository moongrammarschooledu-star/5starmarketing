import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Lead,
  LeadInput,
  LeadNote,
  LeadStatus,
  LeadSource,
  LeadStats,
  LeadPropertyInfo,
} from "@/lib/models/lead";
import type { DateRange, LeadAnalytics } from "@/lib/models/analytics";

const STATUS_TO_DB: Record<LeadStatus, string> = {
  New: "new",
  Contacted: "contacted",
  Interested: "interested",
  "Follow-Up": "follow_up",
  "Site Visit": "site_visit",
  Negotiation: "negotiation",
  Closed: "closed",
  Lost: "lost",
};
const STATUS_FROM_DB: Record<string, LeadStatus> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  follow_up: "Follow-Up",
  site_visit: "Site Visit",
  negotiation: "Negotiation",
  closed: "Closed",
  lost: "Lost",
};

const SOURCE_TO_DB: Record<LeadSource, string> = {
  Website: "website",
  "Property Page": "property_page",
  WhatsApp: "whatsapp",
  Facebook: "facebook",
  Instagram: "instagram",
  TikTok: "tiktok",
  YouTube: "youtube",
  Direct: "direct",
  Other: "other",
  "Site Visit": "site_visit",
};
const SOURCE_FROM_DB: Record<string, LeadSource> = {
  website: "Website",
  property_page: "Property Page",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  direct: "Direct",
  contact_form: "Website",
  other: "Other",
  site_visit: "Site Visit",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToLead(row: any): Lead {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    whatsapp: row.whatsapp ?? undefined,
    email: row.email ?? undefined,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.property_title ?? undefined,
    customerId: row.customer_id ?? undefined,
    message: row.message ?? "",
    source: SOURCE_FROM_DB[row.source] ?? "Website",
    status: STATUS_FROM_DB[row.status] ?? "New",
    consent: !!row.consent,
    nextFollowUpDate: row.next_follow_up_date ?? undefined,
    nextFollowUpTime: row.next_follow_up_time ?? undefined,
    assignedTo: row.assigned_to ?? undefined,
    assignedAgentId: row.assigned_agent_id ?? undefined,
    campaignId: row.campaign_id ?? undefined,
    campaignName: row.campaigns?.name ?? undefined,
    firstTouchSource: row.first_touch_source ?? undefined,
    firstTouchMedium: row.first_touch_medium ?? undefined,
    firstTouchCampaign: row.first_touch_campaign ?? undefined,
    firstTouchContent: row.first_touch_content ?? undefined,
    firstTouchTerm: row.first_touch_term ?? undefined,
    firstTouchLandingPage: row.first_touch_landing_page ?? undefined,
    lastTouchSource: row.last_touch_source ?? undefined,
    lastTouchMedium: row.last_touch_medium ?? undefined,
    lastTouchCampaign: row.last_touch_campaign ?? undefined,
    lastTouchContent: row.last_touch_content ?? undefined,
    lastTouchTerm: row.last_touch_term ?? undefined,
    lastTouchLandingPage: row.last_touch_landing_page ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToNote(row: any): LeadNote {
  return {
    id: row.id,
    leadId: row.lead_id,
    note: row.note,
    createdBy: row.created_by ?? undefined,
    userId: row.user_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

// Computed in the business's own timezone (Lahore, Pakistan) so
// "today" for follow-up due-dates matches the admin's actual calendar
// day regardless of the server's runtime timezone (e.g. Vercel runs UTC).
function todayISO() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export const leadService = {
  async list(): Promise<Lead[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("leadService.list failed:", error);
      throw new Error("Could not load leads.");
    }
    return (data ?? []).map(mapRowToLead);
  },

  async listRecent(limit = 5): Promise<Lead[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("leadService.listRecent failed:", error);
      throw new Error("Could not load leads.");
    }
    return (data ?? []).map(mapRowToLead);
  },

  /** "My Inquiries" (STEP 10) — RLS already restricts a customer session
   *  to their own rows, but filtering explicitly here keeps the query
   *  itself honest about what it's asking for. */
  async listByCustomer(customerId: string): Promise<Lead[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("leadService.listByCustomer failed:", error);
      return [];
    }
    return (data ?? []).map(mapRowToLead);
  },

  /** Used when creating an appointment (STEP 11 section 15): finds the
   *  most recent existing lead for this customer/phone so a site visit
   *  attaches to it rather than always creating a new one. */
  async findExistingForContact(customerId?: string, phone?: string): Promise<Lead | undefined> {
    const supabase = await createClient();
    let query = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(1);
    if (customerId) {
      query = query.eq("customer_id", customerId);
    } else if (phone) {
      query = query.eq("phone", phone);
    } else {
      return undefined;
    }
    const { data, error } = await query.maybeSingle();
    if (error || !data) return undefined;
    return mapRowToLead(data);
  },

  async getById(id: string): Promise<Lead | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("leads").select("*, campaigns(name)").eq("id", id).maybeSingle();
    if (error) {
      console.error("leadService.getById failed:", error);
      throw new Error("Could not load this lead.");
    }
    return data ? mapRowToLead(data) : undefined;
  },

  /** Property details for the lead-details "Property Information" panel —
   *  fetched separately (rather than denormalized) so it always reflects
   *  the property's current price/location/type. */
  async getLeadProperty(propertyId: string): Promise<LeadPropertyInfo | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("properties")
      .select("title, slug, property_type, location, price, size")
      .eq("id", propertyId)
      .maybeSingle();
    if (error || !data) return undefined;
    return {
      title: data.title,
      slug: data.slug,
      type: data.property_type,
      location: data.location,
      price: data.price,
      size: data.size,
    };
  },

  /** Other leads sharing the same phone/WhatsApp number — surfaced to the
   *  admin as a "Possible duplicate lead" warning. Never auto-merged. */
  async findPossibleDuplicates(leadId: string, phone: string, whatsapp?: string): Promise<Lead[]> {
    if (!phone && !whatsapp) return [];
    const supabase = await createClient();
    const numbers = [phone, whatsapp].filter((n): n is string => !!n && n.trim().length > 0);
    if (numbers.length === 0) return [];
    const orClause = numbers
      .flatMap((n) => [`phone.eq.${n}`, `whatsapp.eq.${n}`])
      .join(",");
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .or(orClause)
      .neq("id", leadId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) {
      console.error("leadService.findPossibleDuplicates failed:", error);
      return [];
    }
    return (data ?? []).map(mapRowToLead);
  },

  /** Used by the public property inquiry form, homepage contact form and
   *  WhatsApp tracking — must work for an anonymous visitor, so this uses
   *  the same cookie-bound client ("leads_public_insert" RLS policy allows
   *  anon inserts, insert-only). */
  // Deliberately does not .select() the row back: the "leads_admin_read"
  // RLS policy only grants SELECT to authenticated admins, so an anon
  // visitor's insert can never read their own row back (Postgres/PostgREST
  // treats that as an RLS violation on the implicit RETURNING select).
  // Nothing currently needs the created row, so a plain insert avoids the
  // problem entirely rather than relaxing SELECT access for anon.
  async create(input: LeadInput): Promise<void> {
    const supabase = await createClient();

    // campaign_id is resolved server-side by a security-definer trigger
    // (resolve_lead_campaign_attribution) matching last/first-touch
    // utm_campaign against campaigns.utm_campaign — not here, since an
    // anonymous visitor's client can never read the campaigns table
    // directly (its RLS is admin/manager-only, same reasoning as STEP
    // 14's auto_assign_new_lead trigger).
    const { error } = await supabase.from("leads").insert({
      name: input.name,
      phone: input.phone,
      whatsapp: input.whatsapp || null,
      email: input.email || null,
      property_id: input.propertyId || null,
      property_title: input.propertyTitle || null,
      customer_id: input.customerId || null,
      message: input.message,
      source: SOURCE_TO_DB[input.source],
      status: STATUS_TO_DB[input.status ?? "New"],
      consent: input.consent ?? false,
      first_touch_source: input.firstTouchSource || null,
      first_touch_medium: input.firstTouchMedium || null,
      first_touch_campaign: input.firstTouchCampaign || null,
      first_touch_content: input.firstTouchContent || null,
      first_touch_term: input.firstTouchTerm || null,
      first_touch_landing_page: input.firstTouchLandingPage || null,
      last_touch_source: input.lastTouchSource || null,
      last_touch_medium: input.lastTouchMedium || null,
      last_touch_campaign: input.lastTouchCampaign || null,
      last_touch_content: input.lastTouchContent || null,
      last_touch_term: input.lastTouchTerm || null,
      last_touch_landing_page: input.lastTouchLandingPage || null,
    });

    if (error) {
      console.error("leadService.create failed:", error);
      throw new Error("Could not submit your inquiry. Please try again or use WhatsApp.");
    }
  },

  async updateStatus(id: string, status: LeadStatus): Promise<Lead | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leads")
      .update({ status: STATUS_TO_DB[status] })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("leadService.updateStatus failed:", error);
      throw new Error("Could not update this lead.");
    }
    return data ? mapRowToLead(data) : undefined;
  },

  async updateFollowUp(id: string, date: string | null, time: string | null): Promise<Lead | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leads")
      .update({ next_follow_up_date: date, next_follow_up_time: time })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("leadService.updateFollowUp failed:", error);
      throw new Error("Could not update the follow-up date.");
    }
    return data ? mapRowToLead(data) : undefined;
  },

  /** STEP 14 — assigns by agent id (the real FK), keeping the older
   *  assigned_to text field in sync for anything still reading it. Pass
   *  agentId: null to unassign. */
  async assignAgent(id: string, agentId: string | null, agentName: string | null): Promise<Lead | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leads")
      .update({ assigned_agent_id: agentId, assigned_to: agentName })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("leadService.assignAgent failed:", error);
      throw new Error("Could not assign this lead.");
    }
    return data ? mapRowToLead(data) : undefined;
  },

  /** "My Leads" for the agent portal — RLS already restricts an agent
   *  session to their own assigned rows, but filtering explicitly keeps
   *  the query honest about what it's asking for. */
  async listByAgent(agentId: string): Promise<Lead[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("assigned_agent_id", agentId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("leadService.listByAgent failed:", error);
      return [];
    }
    return (data ?? []).map(mapRowToLead);
  },

  /** Counts used by the team roster / performance pages — unassigned
   *  leads count toward nobody. */
  async countByAgent(): Promise<Map<string, { total: number; open: number; closed: number }>> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("leads").select("assigned_agent_id, status").not("assigned_agent_id", "is", null);
    if (error) {
      console.error("leadService.countByAgent failed:", error);
      return new Map();
    }
    const map = new Map<string, { total: number; open: number; closed: number }>();
    for (const row of data ?? []) {
      const agentId = row.assigned_agent_id as string;
      const entry = map.get(agentId) ?? { total: 0, open: 0, closed: 0 };
      entry.total += 1;
      if (row.status === "closed" || row.status === "lost") entry.closed += 1;
      else entry.open += 1;
      map.set(agentId, entry);
    }
    return map;
  },

  async remove(id: string): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) {
      console.error("leadService.remove failed:", error);
      throw new Error("Could not delete this lead.");
    }
    return true;
  },

  async listNotes(leadId: string): Promise<LeadNote[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lead_notes")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("leadService.listNotes failed:", error);
      throw new Error("Could not load notes.");
    }
    return (data ?? []).map(mapRowToNote);
  },

  async addNote(leadId: string, note: string, createdBy?: string, userId?: string): Promise<LeadNote> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lead_notes")
      .insert({ lead_id: leadId, note, created_by: createdBy || null, user_id: userId || null })
      .select("*")
      .single();
    if (error) {
      console.error("leadService.addNote failed:", error);
      throw new Error("Could not save this note.");
    }
    return mapRowToNote(data);
  },

  async stats(): Promise<LeadStats> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("leads").select("status");
    if (error) {
      console.error("leadService.stats failed:", error);
      throw new Error("Could not load lead stats.");
    }
    const rows = data ?? [];
    const count = (s: string) => rows.filter((r) => r.status === s).length;
    return {
      total: rows.length,
      new: count("new"),
      contacted: count("contacted"),
      interested: count("interested"),
      followUp: count("follow_up"),
      siteVisit: count("site_visit"),
      negotiation: count("negotiation"),
      closed: count("closed"),
      lost: count("lost"),
    };
  },

  async todaysFollowUps(): Promise<Lead[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("next_follow_up_date", todayISO())
      .order("next_follow_up_time", { ascending: true });
    if (error) {
      console.error("leadService.todaysFollowUps failed:", error);
      return [];
    }
    return (data ?? []).map(mapRowToLead);
  },

  async upcomingFollowUps(): Promise<Lead[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .gt("next_follow_up_date", todayISO())
      .order("next_follow_up_date", { ascending: true })
      .limit(10);
    if (error) {
      console.error("leadService.upcomingFollowUps failed:", error);
      return [];
    }
    return (data ?? []).map(mapRowToLead);
  },

  /** Simple counts used by the dashboard's "Leads by Source" /
   *  "Leads by Status" / "Most Inquired Properties" charts. */
  async insights(): Promise<{
    bySource: { label: string; count: number }[];
    byStatus: { label: string; count: number }[];
    topProperties: { label: string; count: number }[];
  }> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("leads").select("source, status, property_title");
    if (error) {
      console.error("leadService.insights failed:", error);
      return { bySource: [], byStatus: [], topProperties: [] };
    }
    const rows = data ?? [];

    const tally = (values: string[]) => {
      const map = new Map<string, number>();
      for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
      return [...map.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);
    };

    const bySource = tally(rows.map((r) => SOURCE_FROM_DB[r.source] ?? "Other"));
    const byStatus = tally(rows.map((r) => STATUS_FROM_DB[r.status] ?? "New"));
    const topProperties = tally(
      rows.filter((r) => r.property_title).map((r) => r.property_title as string)
    ).slice(0, 5);

    return { bySource, byStatus, topProperties };
  },

  /** Full Lead Analytics section (STEP 9) — counts, breakdowns and a
   *  day-by-day trend, all scoped to the selected date range. */
  async analyticsInRange(range: DateRange): Promise<LeadAnalytics> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leads")
      .select("status, source, property_title, created_at")
      .gte("created_at", range.from)
      .lt("created_at", range.to);
    if (error) {
      console.error("leadService.analyticsInRange failed:", error);
      throw new Error("Could not load lead analytics.");
    }
    const rows = data ?? [];
    const count = (s: string) => rows.filter((r) => r.status === s).length;

    const tally = (values: string[]) => {
      const map = new Map<string, number>();
      for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
      return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    };

    const byDay = new Map<string, number>();
    for (const r of rows) {
      const day = new Date(r.created_at).toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    const overTime = [...byDay.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      total: rows.length,
      new: count("new"),
      contacted: count("contacted"),
      interested: count("interested"),
      followUp: count("follow_up"),
      closed: count("closed"),
      lost: count("lost"),
      bySource: tally(rows.map((r) => SOURCE_FROM_DB[r.source] ?? "Other")),
      byStatus: tally(rows.map((r) => STATUS_FROM_DB[r.status] ?? "New")),
      overTime,
      topProperties: tally(rows.filter((r) => r.property_title).map((r) => r.property_title as string)).slice(0, 5),
    };
  },
};
