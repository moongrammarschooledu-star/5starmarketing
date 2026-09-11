import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/models/lead";
import type { MarketingSegment, MarketingSegmentInput, SegmentCondition } from "@/lib/models/marketingTag";
import { leadService } from "./leadService";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): MarketingSegment {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    conditions: row.conditions ?? [],
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

/** Evaluates one saved condition against a real lead — used by
 *  resolve() below. Never invents a match: an unknown field always
 *  fails the condition rather than silently passing. */
function matches(lead: Lead, condition: SegmentCondition): boolean {
  let actual: string | number | undefined;
  switch (condition.field) {
    case "score":
      actual = lead.score;
      break;
    case "scoreLevel":
      actual = lead.scoreLevel;
      break;
    case "status":
      actual = lead.status;
      break;
    case "source":
      actual = lead.source;
      break;
    case "campaignId":
      actual = lead.campaignId;
      break;
    case "propertyId":
      actual = lead.propertyId;
      break;
    case "projectId":
      actual = lead.projectId;
      break;
    case "budgetMin":
      actual = lead.budgetMin;
      break;
    case "budgetMax":
      actual = lead.budgetMax;
      break;
    case "preferredLocation":
      actual = lead.preferredLocation;
      break;
    case "lastContactedDaysAgo":
      actual = lead.lastContactedAt ? daysAgo(lead.lastContactedAt) : undefined;
      break;
    case "createdDaysAgo":
      actual = daysAgo(lead.createdAt);
      break;
  }
  if (actual === undefined) return false;

  switch (condition.operator) {
    case "eq":
      return String(actual) === String(condition.value);
    case "neq":
      return String(actual) !== String(condition.value);
    case "gt":
      return Number(actual) > Number(condition.value);
    case "gte":
      return Number(actual) >= Number(condition.value);
    case "lt":
      return Number(actual) < Number(condition.value);
    case "lte":
      return Number(actual) <= Number(condition.value);
    case "in":
      return Array.isArray(condition.value) && condition.value.map(String).includes(String(actual));
    default:
      return false;
  }
}

export const marketingSegmentService = {
  async list(): Promise<MarketingSegment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("marketing_segments").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("marketingSegmentService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<MarketingSegment | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("marketing_segments").select("*").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: MarketingSegmentInput, createdBy?: string): Promise<MarketingSegment> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("marketing_segments")
      .insert({ name: input.name, description: input.description || null, conditions: input.conditions, created_by: createdBy || null })
      .select("*")
      .single();
    if (error) throw new Error("Could not create this segment.");
    return mapRow(data);
  },

  async update(id: string, input: Partial<MarketingSegmentInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.description !== undefined) row.description = input.description || null;
    if (input.conditions !== undefined) row.conditions = input.conditions;
    const { error } = await supabase.from("marketing_segments").update(row).eq("id", id);
    if (error) throw new Error("Could not update this segment.");
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("marketing_segments").delete().eq("id", id);
    if (error) throw new Error("Could not delete this segment.");
  },

  /** Resolves a segment against LIVE lead data (sections 29-30) — never a
   *  stored membership snapshot. Capped at a sane page size for the admin
   *  preview; use leadService.search directly for anything needing
   *  pagination/export. */
  async resolve(segment: MarketingSegment, limit = 200): Promise<Lead[]> {
    const { leads } = await leadService.search({ pageSize: 100 });
    // search() only returns one page — for a real segment preview we
    // want up to `limit` matches, so pull a few pages if needed.
    const all: Lead[] = [...leads];
    let page = 2;
    while (all.length < limit) {
      const next = await leadService.search({ pageSize: 100, page });
      if (next.leads.length === 0) break;
      all.push(...next.leads);
      if (page >= next.totalPages) break;
      page += 1;
    }
    return all.filter((lead) => segment.conditions.every((c) => matches(lead, c))).slice(0, limit);
  },
};
