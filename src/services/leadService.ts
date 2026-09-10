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
  LeadPriority,
  LeadPurpose,
  LostReason,
  CrmDashboardStats,
} from "@/lib/models/lead";
import type { DateRange, LeadAnalytics } from "@/lib/models/analytics";
import type { LeadSearchFilters, LeadSearchResult, LeadAssignmentHistoryEntry } from "@/lib/models/crm";
import { DEFAULT_LEAD_PAGE_SIZE, MAX_LEAD_PAGE_SIZE } from "@/lib/models/crm";

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

const PURPOSE_TO_DB: Record<LeadPurpose, string> = { Buy: "buy", Rent: "rent", Invest: "invest" };
const PURPOSE_FROM_DB: Record<string, LeadPurpose> = { buy: "Buy", rent: "Rent", invest: "Invest" };

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
    priority: (row.priority as LeadPriority) ?? "Medium",
    leadType: row.lead_type ?? "General Inquiry",
    projectId: row.project_id ?? undefined,
    projectName: row.projects?.name ?? undefined,
    purpose: row.purpose ? PURPOSE_FROM_DB[row.purpose] : undefined,
    budgetMin: row.budget_min ?? undefined,
    budgetMax: row.budget_max ?? undefined,
    preferredLocation: row.preferred_location ?? undefined,
    preferredPropertyType: row.preferred_property_type ?? undefined,
    preferredBedrooms: row.preferred_bedrooms ?? undefined,
    lastContactedAt: row.last_contacted_at ?? undefined,
    lostReason: row.lost_reason ?? undefined,
    convertedAt: row.converted_at ?? undefined,
    convertedBy: row.converted_by ?? undefined,
    convertedByName: row.converted_by_admin?.name ?? undefined,
    archived: !!row.archived,
    archivedAt: row.archived_at ?? undefined,
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

/** Applies every LeadSearchFilters dimension to a Supabase query builder
 *  chain — server-side, real filtering (never fetch-all-then-filter).
 *  `query` is typed loosely since the builder's generic return type
 *  changes shape with every chained call. Archived leads are excluded
 *  by default — the CRM list/pipeline/dashboard only ever see active
 *  leads unless a caller explicitly asks to include archived ones. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildLeadFilteredQuery(query: any, filters: LeadSearchFilters, includeArchived = false) {
  if (!includeArchived) query = query.eq("archived", false);

  if (filters.q) {
    const q = filters.q.replace(/[%_]/g, "\\$&");
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,property_title.ilike.%${q}%,whatsapp.ilike.%${q}%`);
  }
  if (filters.status) query = query.eq("status", STATUS_TO_DB[filters.status]);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.source) query = query.eq("source", SOURCE_TO_DB[filters.source]);
  if (filters.leadType) query = query.eq("lead_type", filters.leadType);
  if (filters.purpose) query = query.eq("purpose", PURPOSE_TO_DB[filters.purpose]);
  if (filters.unassigned) query = query.is("assigned_agent_id", null);
  else if (filters.agentId) query = query.eq("assigned_agent_id", filters.agentId);
  if (filters.campaignId) query = query.eq("campaign_id", filters.campaignId);
  if (filters.propertyId) query = query.eq("property_id", filters.propertyId);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.propertyType) query = query.eq("preferred_property_type", filters.propertyType);
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lt("created_at", filters.dateTo);

  if (filters.followUpDue) {
    const today = todayISO();
    if (filters.followUpDue === "overdue") query = query.lt("next_follow_up_date", today).not("status", "in", "(closed,lost)");
    else if (filters.followUpDue === "today") query = query.eq("next_follow_up_date", today);
    else if (filters.followUpDue === "upcoming") query = query.gt("next_follow_up_date", today);
    else if (filters.followUpDue === "none") query = query.is("next_follow_up_date", null);
  }

  return query;
}

export const leadService = {
  /** CRM lead search (STEP 17, section 12/13/14) — the ONLY method
   *  behind /admin/crm/leads' search/filter/sort/pagination. Everything
   *  is applied server-side via the Supabase query builder. */
  async search(filters: LeadSearchFilters): Promise<LeadSearchResult> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(MAX_LEAD_PAGE_SIZE, Math.max(1, filters.pageSize ?? DEFAULT_LEAD_PAGE_SIZE));
    const supabase = await createClient();

    let query = buildLeadFilteredQuery(supabase.from("leads").select("*, campaigns(name), projects(name)", { count: "exact" }), filters);
    query = query.order("created_at", { ascending: false });

    const from = (page - 1) * pageSize;
    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) {
      console.error("leadService.search failed:", error);
      throw new Error("Could not load leads.");
    }
    const total = count ?? 0;
    return {
      leads: (data ?? []).map(mapRowToLead),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },
  /** CSV export (section 32) — every filter applied, no pagination, capped
   *  at a sane hard limit so a runaway filter combination can't pull the
   *  entire table into memory. */
  async searchAll(filters: LeadSearchFilters, hardLimit = 5000): Promise<Lead[]> {
    const supabase = await createClient();
    let query = buildLeadFilteredQuery(supabase.from("leads").select("*, campaigns(name), projects(name)"), filters);
    query = query.order("created_at", { ascending: false }).range(0, hardLimit - 1);
    const { data, error } = await query;
    if (error) {
      console.error("leadService.searchAll failed:", error);
      throw new Error("Could not export leads.");
    }
    return (data ?? []).map(mapRowToLead);
  },

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
    const { data, error } = await supabase
      .from("leads")
      .select("*, campaigns(name), projects(name), converted_by_admin:admin_profiles!leads_converted_by_fkey(name)")
      .eq("id", id)
      .maybeSingle();
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

  /** Project details for the lead-details "Project Information" panel —
   *  fetched separately so it always reflects the project's current
   *  name/location rather than a denormalized snapshot. */
  async getLeadProject(projectId: string): Promise<{ name: string; slug: string; location: string } | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("projects").select("name, slug, location").eq("id", projectId).maybeSingle();
    if (error || !data) return undefined;
    return { name: data.name, slug: data.slug, location: data.location };
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
      project_id: input.projectId || null,
      project_title: input.projectTitle || null,
      customer_id: input.customerId || null,
      message: input.message,
      source: SOURCE_TO_DB[input.source],
      status: STATUS_TO_DB[input.status ?? "New"],
      consent: input.consent ?? false,
      lead_type: input.leadType ?? "General Inquiry",
      purpose: input.purpose ? PURPOSE_TO_DB[input.purpose] : null,
      budget_min: input.budgetMin ?? null,
      budget_max: input.budgetMax ?? null,
      preferred_location: input.preferredLocation || null,
      preferred_property_type: input.preferredPropertyType || null,
      preferred_bedrooms: input.preferredBedrooms ?? null,
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
   *  agentId: null to unassign. STEP 17 — also records the change in
   *  lead_assignment_history for accountability (section 20). */
  async assignAgent(
    id: string,
    agentId: string | null,
    agentName: string | null,
    changedBy?: string,
    reason?: string
  ): Promise<Lead | undefined> {
    const supabase = await createClient();
    const { data: existing } = await supabase.from("leads").select("assigned_agent_id").eq("id", id).maybeSingle();
    const previousAgentId = existing?.assigned_agent_id ?? null;

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
    if (previousAgentId !== agentId) {
      await supabase.from("lead_assignment_history").insert({
        lead_id: id,
        previous_agent_id: previousAgentId,
        new_agent_id: agentId,
        changed_by: changedBy || null,
        reason: reason || null,
      });
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

  /** Archive (section 44) — the preferred, reversible alternative to
   *  hard delete. Archived leads keep their real status/history; they
   *  just drop out of the default CRM list/pipeline/dashboard views. */
  async archive(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("leads").update({ archived: true, archived_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error("Could not archive this lead.");
  },

  async unarchive(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("leads").update({ archived: false, archived_at: null }).eq("id", id);
    if (error) throw new Error("Could not restore this lead.");
  },

  async setPriority(id: string, priority: LeadPriority): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("leads").update({ priority }).eq("id", id);
    if (error) throw new Error("Could not update this lead's priority.");
  },

  async setLeadType(id: string, leadType: LeadInput["leadType"]): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("leads").update({ lead_type: leadType }).eq("id", id);
    if (error) throw new Error("Could not update this lead's type.");
  },

  /** Customer-requirement fields (section 8) — agent-editable, unlike the
   *  identity/attribution fields the protect_lead_fields_for_agent
   *  trigger locks. */
  async updateRequirements(
    id: string,
    input: {
      purpose?: LeadPurpose;
      budgetMin?: number;
      budgetMax?: number;
      preferredLocation?: string;
      preferredPropertyType?: string;
      preferredBedrooms?: number;
    }
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("leads")
      .update({
        purpose: input.purpose ? PURPOSE_TO_DB[input.purpose] : null,
        budget_min: input.budgetMin ?? null,
        budget_max: input.budgetMax ?? null,
        preferred_location: input.preferredLocation || null,
        preferred_property_type: input.preferredPropertyType || null,
        preferred_bedrooms: input.preferredBedrooms ?? null,
      })
      .eq("id", id);
    if (error) throw new Error("Could not update this lead's requirements.");
  },

  /** Mark Converted (section 35) — captures who/when. There is no
   *  separate transaction/deal module in this deployment, so this only
   *  ever stores conversion metadata on the lead itself, never an
   *  invented transaction record. */
  async markConverted(id: string, convertedByAdminId: string): Promise<Lead | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leads")
      .update({ status: "closed", converted_at: new Date().toISOString(), converted_by: convertedByAdminId, lost_reason: null })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("leadService.markConverted failed:", error);
      throw new Error("Could not mark this lead as converted.");
    }
    return data ? mapRowToLead(data) : undefined;
  },

  /** Mark Lost (section 36) — always requires a reason. */
  async markLost(id: string, reason: LostReason): Promise<Lead | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leads")
      .update({ status: "lost", lost_reason: reason, converted_at: null, converted_by: null })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("leadService.markLost failed:", error);
      throw new Error("Could not mark this lead as lost.");
    }
    return data ? mapRowToLead(data) : undefined;
  },

  /** Merge Lead A into Lead B (section 34) — relinks every related row
   *  (notes, follow-ups, communication log, assignment history,
   *  appointments) onto the target, appends a note preserving the
   *  source's own message/attribution, then archives the source. Never
   *  deletes anything. */
  async mergeInto(sourceId: string, targetId: string, mergedByName: string): Promise<void> {
    if (sourceId === targetId) throw new Error("Cannot merge a lead into itself.");
    const supabase = await createClient();
    const source = await this.getById(sourceId);
    if (!source) throw new Error("Source lead not found.");
    const target = await this.getById(targetId);
    if (!target) throw new Error("Target lead not found.");

    const relink = async (table: string) => {
      const { error } = await supabase.from(table).update({ lead_id: targetId }).eq("lead_id", sourceId);
      if (error) console.error(`leadService.mergeInto: relinking ${table} failed:`, error);
    };
    await Promise.all([relink("lead_notes"), relink("follow_ups"), relink("communication_log"), relink("lead_assignment_history")]);
    await supabase.from("appointments").update({ lead_id: targetId }).eq("lead_id", sourceId);

    const attributionBits = [
      source.firstTouchSource ? `First touch: ${source.firstTouchSource}/${source.firstTouchMedium ?? "—"}` : undefined,
      source.lastTouchSource ? `Last touch: ${source.lastTouchSource}/${source.lastTouchMedium ?? "—"}` : undefined,
    ].filter(Boolean);
    const mergeNote = [
      `Merged from lead "${source.name}" (${source.phone}), created ${source.createdAt.slice(0, 10)}.`,
      source.message ? `Original message: "${source.message}"` : undefined,
      ...attributionBits,
    ]
      .filter(Boolean)
      .join(" ");
    await this.addNote(targetId, mergeNote, mergedByName);

    await this.archive(sourceId);
  },

  /** Accountability trail for every assign/reassign on this lead, manual
   *  or automatic (section 20) — newest first. */
  async listAssignmentHistory(leadId: string): Promise<LeadAssignmentHistoryEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lead_assignment_history")
      .select(
        "*, previous_agent:admin_profiles!lead_assignment_history_previous_agent_id_fkey(name), new_agent:admin_profiles!lead_assignment_history_new_agent_id_fkey(name), changed_by_admin:admin_profiles!lead_assignment_history_changed_by_fkey(name)"
      )
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("leadService.listAssignmentHistory failed:", error);
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({
      id: row.id,
      leadId: row.lead_id,
      previousAgentId: row.previous_agent_id ?? undefined,
      previousAgentName: row.previous_agent?.name ?? undefined,
      newAgentId: row.new_agent_id ?? undefined,
      newAgentName: row.new_agent?.name ?? undefined,
      changedBy: row.changed_by ?? undefined,
      changedByName: row.changed_by_admin?.name ?? undefined,
      reason: row.reason ?? undefined,
      createdAt: row.created_at,
    }));
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

  /** CRM Dashboard (STEP 17, section 1) — active (non-archived) leads
   *  only. "Qualified" reuses "Interested" and "Converted" reuses
   *  "Closed" (display-mapping decision — see CrmDashboardStats). */
  async crmDashboardStats(): Promise<CrmDashboardStats> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("leads").select("status, assigned_agent_id, next_follow_up_date").eq("archived", false);
    if (error) {
      console.error("leadService.crmDashboardStats failed:", error);
      throw new Error("Could not load CRM dashboard stats.");
    }
    const rows = data ?? [];
    const count = (s: string) => rows.filter((r) => r.status === s).length;
    const today = todayISO();
    return {
      total: rows.length,
      new: count("new"),
      contacted: count("contacted"),
      qualified: count("interested"),
      siteVisit: count("site_visit"),
      negotiation: count("negotiation"),
      converted: count("closed"),
      lost: count("lost"),
      followUpDue: rows.filter((r) => r.next_follow_up_date && r.next_follow_up_date <= today && !["closed", "lost"].includes(r.status)).length,
      unassigned: rows.filter((r) => !r.assigned_agent_id && !["closed", "lost"].includes(r.status)).length,
    };
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
