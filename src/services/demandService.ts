import "server-only";
import { createClient } from "@/lib/supabase/server";
import { propertyService, TYPE_FROM_DB, TYPE_TO_DB } from "./propertyService";
import { teamService } from "./teamService";
import { staffNotificationService } from "./staffNotificationService";
import {
  matchDemandsToProperty,
  matchPropertiesToDemand,
  type DemandForProperty,
  type DemandMatch,
} from "@/lib/demandMatching";
import type { DemandInput, DemandPriority, DemandPurpose, DemandStatus, PropertyDemand } from "@/lib/models/demand";
import type { Property, PropertyType } from "@/lib/models/property";

const PURPOSE_TO_DB: Record<DemandPurpose, string> = { "For Sale": "sale", "For Rent": "rent" };
const PURPOSE_FROM_DB: Record<string, DemandPurpose> = { sale: "For Sale", rent: "For Rent" };
const STATUS_FROM_DB: Record<string, DemandStatus> = { open: "Open", matched: "Matched", closed: "Closed", lost: "Lost" };
const PRIORITY_FROM_DB: Record<string, DemandPriority> = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };

/** Only a demand this close to a property triggers a team alert. */
const ALERT_MIN_SCORE = 70;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): PropertyDemand {
  return {
    id: row.id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    clientWhatsapp: row.client_whatsapp ?? undefined,
    purpose: PURPOSE_FROM_DB[row.purpose] ?? "For Sale",
    propertyTypes: ((row.property_types ?? []) as string[]).map((t) => TYPE_FROM_DB[t]).filter((t): t is PropertyType => Boolean(t)),
    locations: row.locations ?? [],
    budgetMin: row.budget_min != null ? Number(row.budget_min) : undefined,
    budgetMax: row.budget_max != null ? Number(row.budget_max) : undefined,
    sizeMinMarla: row.size_min_marla != null ? Number(row.size_min_marla) : undefined,
    sizeMaxMarla: row.size_max_marla != null ? Number(row.size_max_marla) : undefined,
    minBedrooms: row.min_bedrooms ?? undefined,
    priority: PRIORITY_FROM_DB[row.priority] ?? "Normal",
    status: STATUS_FROM_DB[row.status] ?? "Open",
    notes: row.notes ?? undefined,
    assignedTo: row.assigned_to ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: DemandInput) {
  return {
    client_name: input.clientName,
    client_phone: input.clientPhone,
    client_whatsapp: input.clientWhatsapp || null,
    purpose: PURPOSE_TO_DB[input.purpose],
    property_types: input.propertyTypes.map((t) => TYPE_TO_DB[t]),
    locations: input.locations,
    budget_min: input.budgetMin ?? null,
    budget_max: input.budgetMax ?? null,
    size_min_marla: input.sizeMinMarla ?? null,
    size_max_marla: input.sizeMaxMarla ?? null,
    min_bedrooms: input.minBedrooms ?? null,
    priority: input.priority.toLowerCase(),
    status: input.status.toLowerCase(),
    notes: input.notes || null,
    assigned_to: input.assignedTo || null,
  };
}

async function withNames(demands: PropertyDemand[]): Promise<PropertyDemand[]> {
  const ids = [...new Set(demands.flatMap((d) => [d.assignedTo, d.createdBy]).filter((x): x is string => Boolean(x)))];
  if (ids.length === 0) return demands;
  const supabase = await createClient();
  const { data } = await supabase.from("admin_profiles").select("id, name").in("id", ids);
  const names = new Map<string, string>((data ?? []).map((r: { id: string; name: string }) => [r.id, r.name]));
  return demands.map((d) => ({
    ...d,
    assignedToName: d.assignedTo ? names.get(d.assignedTo) : undefined,
    createdByName: d.createdBy ? names.get(d.createdBy) : undefined,
  }));
}

export const demandService = {
  async list(filter: { status?: DemandStatus } = {}): Promise<PropertyDemand[]> {
    const supabase = await createClient();
    let query = supabase.from("property_demands").select("*").order("created_at", { ascending: false });
    if (filter.status) query = query.eq("status", filter.status.toLowerCase());
    const { data, error } = await query;
    if (error) {
      console.error("demandService.list failed:", error);
      throw new Error("Could not load the demands.");
    }
    return withNames((data ?? []).map(mapRow));
  },

  async getById(id: string): Promise<PropertyDemand | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_demands").select("*").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return (await withNames([mapRow(data)]))[0];
  },

  async create(input: DemandInput, createdBy?: string): Promise<PropertyDemand> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("property_demands")
      .insert({ ...toRow(input), created_by: createdBy ?? null })
      .select("*")
      .single();
    if (error || !data) {
      console.error("demandService.create failed:", error);
      throw new Error("Could not save this demand. Please try again.");
    }
    return mapRow(data);
  },

  async update(id: string, input: DemandInput): Promise<PropertyDemand | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_demands").update(toRow(input)).eq("id", id).select("*").maybeSingle();
    if (error) {
      console.error("demandService.update failed:", error);
      throw new Error("Could not update this demand. Please try again.");
    }
    return data ? mapRow(data) : undefined;
  },

  async setStatus(id: string, status: DemandStatus): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("property_demands").update({ status: status.toLowerCase() }).eq("id", id);
    if (error) {
      console.error("demandService.setStatus failed:", error);
      throw new Error("Could not change the status.");
    }
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("property_demands").delete().eq("id", id);
    if (error) {
      console.error("demandService.remove failed:", error);
      throw new Error("Could not delete this demand.");
    }
  },

  async listSharedPropertyIds(demandId: string): Promise<Set<string>> {
    const supabase = await createClient();
    const { data } = await supabase.from("demand_shared_properties").select("property_id").eq("demand_id", demandId);
    return new Set((data ?? []).map((r: { property_id: string }) => r.property_id));
  },

  /** Remembers that this property was sent to the client, and moves an
   *  Open demand to Matched. */
  async markShared(demandId: string, propertyId: string, sharedBy?: string): Promise<void> {
    const supabase = await createClient();
    await supabase
      .from("demand_shared_properties")
      .upsert({ demand_id: demandId, property_id: propertyId, shared_by: sharedBy ?? null }, { onConflict: "demand_id,property_id", ignoreDuplicates: true });
    await supabase.from("property_demands").update({ status: "matched" }).eq("id", demandId).eq("status", "open");
  },

  /** Every available property that fits this demand, best first. */
  async matchesFor(demand: PropertyDemand): Promise<DemandMatch[]> {
    return matchPropertiesToDemand(demand, await propertyService.list());
  },

  /** How many properties fit each demand (all fits / strong-or-good fits). */
  async matchCounts(demands: PropertyDemand[]): Promise<Map<string, { total: number; good: number }>> {
    const counts = new Map<string, { total: number; good: number }>();
    if (demands.length === 0) return counts;
    const properties = await propertyService.list();
    for (const d of demands) {
      const matches = d.status === "Open" || d.status === "Matched" ? matchPropertiesToDemand(d, properties) : [];
      counts.set(d.id, { total: matches.length, good: matches.filter((m) => m.score >= ALERT_MIN_SCORE).length });
    }
    return counts;
  },

  /** The other direction: which waiting clients fit this property. */
  async demandsForProperty(property: Property): Promise<DemandForProperty[]> {
    const open = await this.list();
    return matchDemandsToProperty(property, open);
  },

  /** Tells the team that a property just added (or just made available)
   *  fits clients who are already waiting. Best-effort - never blocks the
   *  property being saved. Returns how many demands it fits. */
  async alertTeamAboutProperty(property: Property): Promise<number> {
    try {
      if (property.status !== "Available") return 0;
      const hits = (await this.demandsForProperty(property)).filter((h) => h.match.score >= ALERT_MIN_SCORE);
      if (hits.length === 0) return 0;

      const staff = await teamService.listAssignable();
      const admins = staff.filter((s) => s.role === "super_admin" || s.role === "admin").map((s) => s.id);
      const managers = staff.filter((s) => s.role === "sales_manager").map((s) => s.id);

      const byUser = new Map<string, DemandForProperty[]>();
      for (const hit of hits) {
        const recipients = hit.demand.assignedTo ? [hit.demand.assignedTo, ...admins] : [...admins, ...managers];
        for (const userId of new Set(recipients)) byUser.set(userId, [...(byUser.get(userId) ?? []), hit]);
      }

      for (const [userId, list] of byUser) {
        const names = list.slice(0, 3).map((h) => h.demand.clientName).join(", ");
        const more = list.length > 3 ? ` and ${list.length - 3} more` : "";
        await staffNotificationService.notify(
          userId,
          "demand_match",
          "New property fits waiting clients",
          `"${property.title}" fits ${list.length === 1 ? "a client demand" : `${list.length} client demands`}: ${names}${more}.`,
          "demand",
          list[0].demand.id
        );
      }
      return hits.length;
    } catch (e) {
      console.error("demandService.alertTeamAboutProperty failed:", e);
      return 0;
    }
  },
};
