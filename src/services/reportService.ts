import "server-only";
import { createClient } from "@/lib/supabase/server";
import { leadService } from "./leadService";
import { analyticsService } from "./analyticsService";
import type { DateRange, CountBucket } from "@/lib/models/analytics";

export interface PropertyReport {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  inactive: number;
  byType: CountBucket[];
  byLocation: CountBucket[];
  byStatus: CountBucket[];
}

export interface LeadReport {
  total: number;
  new: number;
  contacted: number;
  interested: number;
  followUp: number;
  closed: number;
  lost: number;
  bySource: CountBucket[];
  byProperty: CountBucket[];
  byStatus: CountBucket[];
  byDate: { date: string; count: number }[];
}

export interface ProjectReport {
  total: number;
  upcoming: number;
  ongoing: number;
  completed: number;
  byStatus: CountBucket[];
}

function tally(values: string[]): CountBucket[] {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export const reportService = {
  /** Property Report (STEP 9, section 10) — current inventory, same
   *  reasoning as the dashboard's Property Analytics: composition of
   *  what's on the site right now, not filtered by date. */
  async propertyReport(): Promise<PropertyReport> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("properties").select("property_type, status, location_area");
    if (error) {
      console.error("reportService.propertyReport failed:", error);
      throw new Error("Could not load the property report.");
    }
    const rows = data ?? [];
    const TYPE_LABEL: Record<string, string> = { house: "House", flat: "Flat", residential_plot: "Residential Plot", commercial: "Commercial" };
    const STATUS_LABEL: Record<string, string> = { available: "Available", reserved: "Reserved", sold: "Sold", inactive: "Inactive" };

    return {
      total: rows.length,
      available: rows.filter((r) => r.status === "available").length,
      reserved: rows.filter((r) => r.status === "reserved").length,
      sold: rows.filter((r) => r.status === "sold").length,
      inactive: rows.filter((r) => r.status === "inactive").length,
      byType: tally(rows.map((r) => TYPE_LABEL[r.property_type] ?? r.property_type)),
      byLocation: tally(rows.map((r) => r.location_area ?? "Other Locations")),
      byStatus: tally(rows.map((r) => STATUS_LABEL[r.status] ?? r.status)),
    };
  },

  /** Lead Report (section 11) — scoped to the selected date range. */
  async leadReport(range: DateRange): Promise<LeadReport> {
    const a = await leadService.analyticsInRange(range);
    return {
      total: a.total,
      new: a.new,
      contacted: a.contacted,
      interested: a.interested,
      followUp: a.followUp,
      closed: a.closed,
      lost: a.lost,
      bySource: a.bySource,
      byProperty: a.topProperties,
      byStatus: a.byStatus,
      byDate: a.overTime,
    };
  },

  /** Project Report (section 12's counterpart — projects, not leads). */
  async projectReport(): Promise<ProjectReport> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("projects").select("status");
    if (error) {
      console.error("reportService.projectReport failed:", error);
      throw new Error("Could not load the project report.");
    }
    const rows = data ?? [];
    const STATUS_LABEL: Record<string, string> = { upcoming: "Upcoming", ongoing: "Ongoing", completed: "Completed" };
    return {
      total: rows.length,
      upcoming: rows.filter((r) => r.status === "upcoming").length,
      ongoing: rows.filter((r) => r.status === "ongoing").length,
      completed: rows.filter((r) => r.status === "completed").length,
      byStatus: tally(rows.map((r) => STATUS_LABEL[r.status] ?? r.status)),
    };
  },

  /** Marketing Report (section 12) — lead-source comparison. Sources with
   *  zero tracked leads simply never appear (tally only counts what was
   *  actually observed), so nothing is invented. */
  async marketingReport(range: DateRange): Promise<CountBucket[]> {
    return analyticsService.marketingSources(range);
  },
};
