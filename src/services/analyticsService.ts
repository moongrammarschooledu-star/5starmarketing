import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DateRange, DateRangeKey, PropertyAnalytics, ConversionMetrics, PropertyPerformanceRow, DashboardOverview, CountBucket } from "@/lib/models/analytics";

const KARACHI_TZ = "Asia/Karachi";

function todayISODate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KARACHI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Resolves a UI date-range key into a concrete [from, to) window, using
 *  Pakistan's calendar day so "Today" always matches the admin's own day
 *  regardless of the server's runtime timezone (e.g. Vercel runs UTC). */
export function resolveDateRange(key: DateRangeKey, custom?: { from?: string; to?: string }): DateRange {
  const today = todayISODate();
  const label = { today: "Today", "7d": "7 Days", "30d": "30 Days", "90d": "90 Days", year: "This Year", custom: "Custom Range" }[key];

  if (key === "custom" && custom?.from && custom?.to) {
    return { key, from: `${custom.from}T00:00:00.000Z`, to: `${addDays(custom.to, 1)}T00:00:00.000Z`, label };
  }
  if (key === "today") {
    return { key, from: `${today}T00:00:00.000Z`, to: `${addDays(today, 1)}T00:00:00.000Z`, label };
  }
  if (key === "year") {
    const year = today.slice(0, 4);
    return { key, from: `${year}-01-01T00:00:00.000Z`, to: `${addDays(today, 1)}T00:00:00.000Z`, label };
  }
  const days = key === "7d" ? 7 : key === "30d" ? 30 : 90;
  return { key, from: `${addDays(today, -days + 1)}T00:00:00.000Z`, to: `${addDays(today, 1)}T00:00:00.000Z`, label };
}

function tally(values: string[]): CountBucket[] {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export const analyticsService = {
  resolveDateRange,

  /** Best-effort — a tracking failure must never break the visitor's page. */
  async recordPropertyView(propertyId: string, sessionId?: string): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from("property_views").insert({ property_id: propertyId, session_id: sessionId || null });
    } catch (e) {
      console.error("analyticsService.recordPropertyView failed:", e);
    }
  },

  async recordEvent(
    eventType: "whatsapp_click" | "phone_click" | "contact_form_submit" | "project_view",
    opts: { propertyId?: string; projectId?: string; sessionId?: string }
  ): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from("website_events").insert({
        event_type: eventType,
        property_id: opts.propertyId || null,
        project_id: opts.projectId || null,
        session_id: opts.sessionId || null,
      });
    } catch (e) {
      console.error("analyticsService.recordEvent failed:", e);
    }
  },

  /** Current-state business overview (section 1) — always all-time, not
   *  affected by the analytics time filter (these are pipeline totals,
   *  not "activity within a period"). */
  async overview(): Promise<DashboardOverview> {
    const supabase = await createClient();
    const [{ data: properties, error: pErr }, { data: projects, error: jErr }, { data: leads, error: lErr }] = await Promise.all([
      supabase.from("properties").select("status"),
      supabase.from("projects").select("status"),
      supabase.from("leads").select("status, next_follow_up_date"),
    ]);
    if (pErr || jErr || lErr) {
      console.error("analyticsService.overview failed:", pErr || jErr || lErr);
      throw new Error("Could not load dashboard overview.");
    }
    const p = properties ?? [];
    const j = projects ?? [];
    const l = leads ?? [];
    const today = todayISODate();

    return {
      totalProperties: p.length,
      availableProperties: p.filter((r) => r.status === "available").length,
      reservedProperties: p.filter((r) => r.status === "reserved").length,
      soldProperties: p.filter((r) => r.status === "sold").length,
      totalProjects: j.length,
      activeProjects: j.filter((r) => r.status === "ongoing" || r.status === "upcoming").length,
      totalLeads: l.length,
      newLeads: l.filter((r) => r.status === "new").length,
      followUpsDue: l.filter((r) => r.next_follow_up_date && r.next_follow_up_date <= today && r.status !== "closed" && r.status !== "lost").length,
      closedLeads: l.filter((r) => r.status === "closed").length,
    };
  },

  /** Property Analytics (section 2) — current inventory composition, not
   *  time-filtered (a static breakdown of what's on the site right now;
   *  see the STEP 9 report for why this differs from Lead Analytics). */
  async propertyAnalytics(): Promise<PropertyAnalytics> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("properties")
      .select("property_type, status, location_area, payment_option, featured");
    if (error) {
      console.error("analyticsService.propertyAnalytics failed:", error);
      throw new Error("Could not load property analytics.");
    }
    const rows = data ?? [];
    const TYPE_LABEL: Record<string, string> = { house: "House", flat: "Flat", residential_plot: "Residential Plot", commercial: "Commercial" };
    const STATUS_LABEL: Record<string, string> = { available: "Available", reserved: "Reserved", sold: "Sold", inactive: "Inactive" };
    const PAYMENT_LABEL: Record<string, string> = { cash: "Cash", installments: "Installments", both: "Cash / Installments" };

    return {
      total: rows.length,
      available: rows.filter((r) => r.status === "available").length,
      reserved: rows.filter((r) => r.status === "reserved").length,
      sold: rows.filter((r) => r.status === "sold").length,
      featured: rows.filter((r) => r.featured).length,
      byType: tally(rows.map((r) => TYPE_LABEL[r.property_type] ?? r.property_type)),
      byStatus: tally(rows.map((r) => STATUS_LABEL[r.status] ?? r.status)),
      byLocation: tally(rows.map((r) => r.location_area ?? "Other Locations")),
      byPaymentOption: tally(rows.map((r) => PAYMENT_LABEL[r.payment_option] ?? r.payment_option)),
    };
  },

  /** Lead Analytics + Conversion Analytics — both scoped to the selected
   *  date range (leads created within it), since these are genuinely
   *  activity-over-time metrics. */
  async leadsInRange(range: DateRange) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leads")
      .select("status, source, property_title, created_at")
      .gte("created_at", range.from)
      .lt("created_at", range.to);
    if (error) {
      console.error("analyticsService.leadsInRange failed:", error);
      throw new Error("Could not load lead analytics.");
    }
    return data ?? [];
  },

  async conversionMetrics(range: DateRange): Promise<ConversionMetrics> {
    const rows = await this.leadsInRange(range);
    const total = rows.length;
    if (total < 5) {
      return { hasEnoughData: false, totalLeads: total, contactRate: null, interestRate: null, leadConversionRate: null, closedLeadRate: null };
    }
    const beyondNew = rows.filter((r) => r.status !== "new").length;
    const reachedInterested = rows.filter((r) => ["interested", "follow_up", "closed"].includes(r.status)).length;
    const closed = rows.filter((r) => r.status === "closed").length;
    const lost = rows.filter((r) => r.status === "lost").length;
    const decided = closed + lost;

    return {
      hasEnoughData: true,
      totalLeads: total,
      contactRate: beyondNew / total,
      interestRate: beyondNew > 0 ? reachedInterested / beyondNew : null,
      leadConversionRate: closed / total,
      closedLeadRate: decided > 0 ? closed / decided : null,
    };
  },

  /** "Top Performing Properties" (section 6) — real property_views /
   *  leads / website_events counts, joined per property, ranked by
   *  inquiry count. Properties with no tracked activity show zeroes,
   *  never invented numbers. */
  async propertyPerformance(range: DateRange, limit = 10): Promise<PropertyPerformanceRow[]> {
    const supabase = await createClient();
    const [{ data: properties, error: pErr }, { data: views, error: vErr }, { data: leads, error: lErr }, { data: events, error: eErr }] =
      await Promise.all([
        supabase.from("properties").select("id, title, status"),
        supabase.from("property_views").select("property_id").gte("created_at", range.from).lt("created_at", range.to),
        supabase.from("leads").select("property_id").gte("created_at", range.from).lt("created_at", range.to).not("property_id", "is", null),
        supabase
          .from("website_events")
          .select("property_id")
          .eq("event_type", "whatsapp_click")
          .gte("created_at", range.from)
          .lt("created_at", range.to)
          .not("property_id", "is", null),
      ]);
    if (pErr || vErr || lErr || eErr) {
      console.error("analyticsService.propertyPerformance failed:", pErr || vErr || lErr || eErr);
      return [];
    }

    const countBy = (rows: { property_id: string | null }[]) => {
      const map = new Map<string, number>();
      for (const r of rows) if (r.property_id) map.set(r.property_id, (map.get(r.property_id) ?? 0) + 1);
      return map;
    };
    const viewCounts = countBy(views ?? []);
    const inquiryCounts = countBy(leads ?? []);
    const clickCounts = countBy(events ?? []);

    const STATUS_LABEL: Record<string, string> = { available: "Available", reserved: "Reserved", sold: "Sold", inactive: "Inactive" };

    const rows: PropertyPerformanceRow[] = (properties ?? []).map((p) => ({
      propertyId: p.id,
      title: p.title,
      status: STATUS_LABEL[p.status] ?? p.status,
      views: viewCounts.get(p.id) ?? 0,
      inquiries: inquiryCounts.get(p.id) ?? 0,
      whatsappClicks: clickCounts.get(p.id) ?? 0,
    }));

    return rows
      .filter((r) => r.views > 0 || r.inquiries > 0 || r.whatsappClicks > 0)
      .sort((a, b) => b.inquiries - a.inquiries || b.views - a.views)
      .slice(0, limit);
  },

  /** Marketing Report (section 12) — lead-source comparison, scoped to
   *  the selected range. */
  async marketingSources(range: DateRange): Promise<CountBucket[]> {
    const rows = await this.leadsInRange(range);
    const SOURCE_LABEL: Record<string, string> = {
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
    };
    return tally(rows.map((r) => SOURCE_LABEL[r.source] ?? "Other"));
  },
};
