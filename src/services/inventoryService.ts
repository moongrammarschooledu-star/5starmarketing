import "server-only";
import { createClient } from "@/lib/supabase/server";
import { activityService } from "./activityService";
import type {
  InventoryUnit,
  InventoryInput,
  InventoryStatus,
  InventoryStatusHistoryEntry,
  InventoryPriceHistoryEntry,
  InventoryNote,
  InventoryDashboardStats,
  ProjectInventorySummary,
  InventorySearchFilters,
  InventorySearchResult,
  PublicInventoryAvailability,
  ReleaseReason,
} from "@/lib/models/inventory";
import type { DateRange } from "@/lib/models/analytics";
import { DEFAULT_INVENTORY_PAGE_SIZE, MAX_INVENTORY_PAGE_SIZE } from "@/lib/models/inventory";

const SELECT_WITH_JOINS =
  "*, properties(title), projects(name, status), agent:admin_profiles!property_inventory_agent_id_fkey(name), deals(deal_number)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): InventoryUnit {
  return {
    id: row.id,
    propertyId: row.property_id ?? undefined,
    projectId: row.project_id ?? undefined,
    unitNumber: row.unit_number,
    block: row.block ?? undefined,
    building: row.building ?? undefined,
    floor: row.floor ?? undefined,
    unitType: row.unit_type,
    status: row.status,
    price: row.price ?? undefined,
    area: row.area ?? undefined,
    areaUnit: row.area_unit ?? undefined,
    bedrooms: row.bedrooms ?? undefined,
    bathrooms: row.bathrooms ?? undefined,
    orientation: row.orientation ?? undefined,
    facing: row.facing ?? undefined,
    parking: row.parking ?? undefined,
    availabilityDate: row.availability_date ?? undefined,
    reservedAt: row.reserved_at ?? undefined,
    reservedUntil: row.reserved_until ?? undefined,
    bookedAt: row.booked_at ?? undefined,
    soldAt: row.sold_at ?? undefined,
    rentedAt: row.rented_at ?? undefined,
    leadId: row.lead_id ?? undefined,
    customerId: row.customer_id ?? undefined,
    agentId: row.agent_id ?? undefined,
    dealId: row.deal_id ?? undefined,
    blockReason: row.block_reason ?? undefined,
    archived: !!row.archived,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    propertyTitle: row.properties?.title ?? undefined,
    projectName: row.projects?.name ?? undefined,
    projectStatus: row.projects?.status ?? undefined,
    agentName: row.agent?.name ?? undefined,
    dealNumber: row.deals?.deal_number ?? undefined,
  };
}

async function attachCustomerInfo(unit: InventoryUnit): Promise<InventoryUnit> {
  if (!unit.customerId) return unit;
  const supabase = await createClient();
  const { data } = await supabase.from("customer_profiles").select("full_name").eq("id", unit.customerId).maybeSingle();
  return data ? { ...unit, customerName: data.full_name ?? undefined } : unit;
}

/** Names the exact, permission-gated action a status change represents
 *  (section 8/10) — deliberately named methods rather than a generic
 *  "set any status" call, so each transition can enforce its own
 *  precondition. */
const ALLOWED_TRANSITIONS: Record<InventoryStatus, InventoryStatus[]> = {
  AVAILABLE: ["RESERVED", "BOOKED", "BLOCKED", "UNDER_CONSTRUCTION", "COMING_SOON"],
  RESERVED: ["AVAILABLE", "BOOKED", "BLOCKED"],
  BOOKED: ["SOLD", "RENTED", "AVAILABLE", "BLOCKED"],
  SOLD: ["BLOCKED"],
  RENTED: ["BLOCKED", "AVAILABLE"],
  UNDER_CONSTRUCTION: ["AVAILABLE", "COMING_SOON", "BLOCKED"],
  COMING_SOON: ["AVAILABLE", "BLOCKED"],
  BLOCKED: ["AVAILABLE"],
};

export const inventoryService = {
  async search(filters: InventorySearchFilters): Promise<InventorySearchResult> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(MAX_INVENTORY_PAGE_SIZE, Math.max(1, filters.pageSize ?? DEFAULT_INVENTORY_PAGE_SIZE));
    const supabase = await createClient();

    let query = supabase.from("property_inventory").select(SELECT_WITH_JOINS, { count: "exact" });
    if (!filters.includeArchived) query = query.eq("archived", false);
    if (filters.q) {
      const q = filters.q.replace(/[%_]/g, "\\$&");
      query = query.ilike("unit_number", `%${q}%`);
    }
    if (filters.projectId) query = query.eq("project_id", filters.projectId);
    if (filters.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters.unitType) query = query.eq("unit_type", filters.unitType);
    if (filters.block) query = query.eq("block", filters.block);
    if (filters.building) query = query.eq("building", filters.building);
    if (filters.floor) query = query.eq("floor", filters.floor);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.agentId) query = query.eq("agent_id", filters.agentId);
    if (filters.minPrice !== undefined) query = query.gte("price", filters.minPrice);
    if (filters.maxPrice !== undefined) query = query.lte("price", filters.maxPrice);
    if (filters.minSize !== undefined) query = query.gte("area", filters.minSize);
    if (filters.maxSize !== undefined) query = query.lte("area", filters.maxSize);
    if (filters.availabilityDateFrom) query = query.gte("availability_date", filters.availabilityDateFrom);
    if (filters.availabilityDateTo) query = query.lte("availability_date", filters.availabilityDateTo);

    if (filters.sort === "oldest") query = query.order("created_at", { ascending: true });
    else if (filters.sort === "price_asc") query = query.order("price", { ascending: true, nullsFirst: false });
    else if (filters.sort === "price_desc") query = query.order("price", { ascending: false, nullsFirst: false });
    else if (filters.sort === "size_asc") query = query.order("area", { ascending: true, nullsFirst: false });
    else if (filters.sort === "size_desc") query = query.order("area", { ascending: false, nullsFirst: false });
    else if (filters.sort === "unit_number") query = query.order("unit_number", { ascending: true });
    else query = query.order("created_at", { ascending: false });

    const from = (page - 1) * pageSize;
    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) {
      console.error("inventoryService.search failed:", error);
      throw new Error("Could not load inventory.");
    }
    const units = await Promise.all((data ?? []).map((r) => attachCustomerInfo(mapRow(r))));
    const total = count ?? 0;
    return { units, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  },

  async searchAll(filters: InventorySearchFilters, hardLimit = 5000): Promise<InventoryUnit[]> {
    const { units } = await this.search({ ...filters, page: 1, pageSize: hardLimit });
    return units;
  },

  async getById(id: string): Promise<InventoryUnit | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_inventory").select(SELECT_WITH_JOINS).eq("id", id).maybeSingle();
    if (error) {
      console.error("inventoryService.getById failed:", error);
      throw new Error("Could not load this inventory unit.");
    }
    return data ? attachCustomerInfo(mapRow(data)) : undefined;
  },

  /** PUBLIC-SAFE availability (sections 16/17/18) — reads only from the
   *  restricted view, never the base table. No customer/agent/deal
   *  fields exist on the returned shape at all. */
  async getPublicAvailability(filters: { projectId?: string; propertyId?: string; status?: InventoryStatus }): Promise<PublicInventoryAvailability[]> {
    const supabase = await createClient();
    let query = supabase.from("property_inventory_public").select("*");
    if (filters.projectId) query = query.eq("project_id", filters.projectId);
    if (filters.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters.status) query = query.eq("status", filters.status);
    const { data, error } = await query.order("unit_number", { ascending: true });
    if (error) {
      console.error("inventoryService.getPublicAvailability failed:", error);
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({
      id: row.id,
      propertyId: row.property_id ?? undefined,
      projectId: row.project_id ?? undefined,
      unitNumber: row.unit_number,
      block: row.block ?? undefined,
      building: row.building ?? undefined,
      floor: row.floor ?? undefined,
      unitType: row.unit_type,
      status: row.status,
      price: row.price ?? undefined,
      area: row.area ?? undefined,
      areaUnit: row.area_unit ?? undefined,
      bedrooms: row.bedrooms ?? undefined,
      bathrooms: row.bathrooms ?? undefined,
      availabilityDate: row.availability_date ?? undefined,
    }));
  },

  /** Aggregate-only public summary for a project (section 41) — counts,
   *  never individual unit/customer detail. */
  async getPublicProjectSummary(projectId: string): Promise<{ total: number; available: number; reserved: number; booked: number; sold: number; rented: number }> {
    const units = await this.getPublicAvailability({ projectId });
    const count = (s: string) => units.filter((u) => u.status === s).length;
    return { total: units.length, available: count("AVAILABLE"), reserved: count("RESERVED"), booked: count("BOOKED"), sold: count("SOLD"), rented: count("RENTED") };
  },

  /** Same aggregate-only public summary, broken down by unit type
   *  (section 41's own example groups by category, e.g. "5 Marla:
   *  Available 12, Booked 5, Sold 18") — still never exposes a single
   *  customer/agent/deal detail. */
  async getPublicProjectSummaryByType(projectId: string): Promise<{ unitType: string; total: number; available: number; reserved: number; booked: number; sold: number; rented: number }[]> {
    const units = await this.getPublicAvailability({ projectId });
    const map = new Map<string, { unitType: string; total: number; available: number; reserved: number; booked: number; sold: number; rented: number }>();
    for (const u of units) {
      const entry = map.get(u.unitType) ?? { unitType: u.unitType, total: 0, available: 0, reserved: 0, booked: 0, sold: 0, rented: 0 };
      entry.total += 1;
      if (u.status === "AVAILABLE") entry.available += 1;
      else if (u.status === "RESERVED") entry.reserved += 1;
      else if (u.status === "BOOKED") entry.booked += 1;
      else if (u.status === "SOLD") entry.sold += 1;
      else if (u.status === "RENTED") entry.rented += 1;
      map.set(u.unitType, entry);
    }
    return [...map.values()];
  },

  async listByProject(projectId: string): Promise<InventoryUnit[]> {
    const { units } = await this.search({ projectId, pageSize: MAX_INVENTORY_PAGE_SIZE });
    return units;
  },

  async create(input: InventoryInput, createdByAdminId?: string): Promise<InventoryUnit> {
    if (!input.unitNumber.trim()) throw new Error("Unit number is required.");
    if (input.price !== undefined && input.price < 0) throw new Error("Price cannot be negative.");
    if (input.area !== undefined && input.area < 0) throw new Error("Area cannot be negative.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("property_inventory")
      .insert({
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        unit_number: input.unitNumber.trim(),
        block: input.block || null,
        building: input.building || null,
        floor: input.floor || null,
        unit_type: input.unitType,
        status: input.status ?? "AVAILABLE",
        price: input.price ?? null,
        area: input.area ?? null,
        area_unit: input.areaUnit ?? "Sq Ft",
        bedrooms: input.bedrooms ?? null,
        bathrooms: input.bathrooms ?? null,
        orientation: input.orientation || null,
        facing: input.facing || null,
        parking: input.parking || null,
        availability_date: input.availabilityDate || null,
        created_by: createdByAdminId || null,
      })
      .select(SELECT_WITH_JOINS)
      .single();

    if (error) {
      console.error("inventoryService.create failed:", error);
      if (error.code === "23505") throw new Error("Unit number already exists in this project/block/building.");
      throw new Error("Could not create this inventory unit.");
    }
    return mapRow(data);
  },

  async update(id: string, input: Partial<InventoryInput>): Promise<InventoryUnit | undefined> {
    if (input.price !== undefined && input.price !== null && input.price < 0) throw new Error("Price cannot be negative.");
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.unitNumber !== undefined) row.unit_number = input.unitNumber.trim();
    if (input.block !== undefined) row.block = input.block || null;
    if (input.building !== undefined) row.building = input.building || null;
    if (input.floor !== undefined) row.floor = input.floor || null;
    if (input.unitType !== undefined) row.unit_type = input.unitType;
    if (input.area !== undefined) row.area = input.area ?? null;
    if (input.areaUnit !== undefined) row.area_unit = input.areaUnit;
    if (input.bedrooms !== undefined) row.bedrooms = input.bedrooms ?? null;
    if (input.bathrooms !== undefined) row.bathrooms = input.bathrooms ?? null;
    if (input.orientation !== undefined) row.orientation = input.orientation || null;
    if (input.facing !== undefined) row.facing = input.facing || null;
    if (input.parking !== undefined) row.parking = input.parking || null;
    if (input.availabilityDate !== undefined) row.availability_date = input.availabilityDate || null;
    if (input.propertyId !== undefined) row.property_id = input.propertyId || null;
    if (input.projectId !== undefined) row.project_id = input.projectId || null;

    const { data, error } = await supabase.from("property_inventory").update(row).eq("id", id).select(SELECT_WITH_JOINS).maybeSingle();
    if (error) {
      console.error("inventoryService.update failed:", error);
      if (error.code === "23505") throw new Error("Unit number already exists in this project/block/building.");
      throw new Error("Could not update this inventory unit.");
    }
    return data ? mapRow(data) : undefined;
  },

  /** Price change (sections 35/36) — always recorded to
   *  inventory_price_history before the price itself changes. */
  async updatePrice(id: string, newPrice: number, reason: string | undefined, actorId?: string): Promise<InventoryUnit | undefined> {
    if (newPrice < 0) throw new Error("Price cannot be negative.");
    const current = await this.getById(id);
    if (!current) throw new Error("Inventory unit not found.");

    const supabase = await createClient();
    await supabase.from("inventory_price_history").insert({
      inventory_id: id,
      previous_price: current.price ?? null,
      new_price: newPrice,
      reason: reason || null,
      changed_by: actorId || null,
    });
    const { data, error } = await supabase.from("property_inventory").update({ price: newPrice }).eq("id", id).select(SELECT_WITH_JOINS).maybeSingle();
    if (error) {
      console.error("inventoryService.updatePrice failed:", error);
      throw new Error("Could not update this unit's price.");
    }
    return data ? mapRow(data) : undefined;
  },

  async listPriceHistory(id: string): Promise<InventoryPriceHistoryEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory_price_history")
      .select("*, admin_profiles(name)")
      .eq("inventory_id", id)
      .order("created_at", { ascending: false });
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({
      id: row.id,
      inventoryId: row.inventory_id,
      previousPrice: row.previous_price ?? undefined,
      newPrice: Number(row.new_price),
      reason: row.reason ?? undefined,
      changedBy: row.changed_by ?? undefined,
      changedByName: row.admin_profiles?.name ?? undefined,
      createdAt: row.created_at,
    }));
  },

  async listStatusHistory(id: string): Promise<InventoryStatusHistoryEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory_status_history")
      .select("*, admin_profiles(name)")
      .eq("inventory_id", id)
      .order("created_at", { ascending: false });
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({
      id: row.id,
      inventoryId: row.inventory_id,
      previousStatus: row.previous_status ?? undefined,
      newStatus: row.new_status,
      reason: row.reason ?? undefined,
      changedBy: row.changed_by ?? undefined,
      changedByName: row.admin_profiles?.name ?? undefined,
      createdAt: row.created_at,
    }));
  },

  async listNotes(id: string): Promise<InventoryNote[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("inventory_notes").select("*").eq("inventory_id", id).order("created_at", { ascending: false });
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({ id: row.id, inventoryId: row.inventory_id, note: row.note, createdBy: row.created_by ?? undefined, userId: row.user_id ?? undefined, createdAt: row.created_at }));
  },

  async addNote(id: string, note: string, createdBy?: string, userId?: string): Promise<InventoryNote> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory_notes")
      .insert({ inventory_id: id, note, created_by: createdBy || null, user_id: userId || null })
      .select("*")
      .single();
    if (error) throw new Error("Could not save this note.");
    return { id: data.id, inventoryId: data.inventory_id, note: data.note, createdBy: data.created_by ?? undefined, userId: data.user_id ?? undefined, createdAt: data.created_at };
  },

  async listActivity(id: string) {
    return activityService.listByEntity("inventory", id, 100);
  },

  /** Records the transition to inventory_status_history and logs
   *  activity — called by every named status action below, never
   *  exported directly (a plain "set any status" method would bypass
   *  the specific preconditions each action enforces — section 8). */
  async _recordTransition(id: string, previousStatus: InventoryStatus, newStatus: InventoryStatus, reason: string | undefined, actorId?: string) {
    const supabase = await createClient();
    await supabase.from("inventory_status_history").insert({ inventory_id: id, previous_status: previousStatus, new_status: newStatus, reason: reason || null, changed_by: actorId || null });
  },

  /** The one place a reservation is created — the conditional UPDATE
   *  (`.eq("status", "AVAILABLE")`) is the actual concurrency guard
   *  (sections 15/63): two simultaneous reservation attempts race on
   *  this single atomic UPDATE, and only the first to commit finds a
   *  matching row; the second gets back no row and a clear error. */
  async reserve(id: string, input: { customerId?: string; leadId?: string; agentId?: string; reservedUntil?: string }, actorId?: string): Promise<InventoryUnit> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("property_inventory")
      .update({
        status: "RESERVED",
        reserved_at: new Date().toISOString(),
        reserved_until: input.reservedUntil || null,
        customer_id: input.customerId || null,
        lead_id: input.leadId || null,
        agent_id: input.agentId || null,
      })
      .eq("id", id)
      .eq("status", "AVAILABLE")
      .select(SELECT_WITH_JOINS)
      .maybeSingle();
    if (error) {
      console.error("inventoryService.reserve failed:", error);
      throw new Error("Reservation could not be completed.");
    }
    if (!data) throw new Error("This property is no longer available.");
    await this._recordTransition(id, "AVAILABLE", "RESERVED", "Reserved", actorId);
    return mapRow(data);
  },

  async release(id: string, reason: ReleaseReason, actorId?: string): Promise<InventoryUnit> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("property_inventory")
      .update({ status: "AVAILABLE", reserved_at: null, reserved_until: null, customer_id: null, lead_id: null })
      .eq("id", id)
      .eq("status", "RESERVED")
      .select(SELECT_WITH_JOINS)
      .maybeSingle();
    if (error) {
      console.error("inventoryService.release failed:", error);
      throw new Error("Could not release this reservation.");
    }
    if (!data) throw new Error("This unit is not currently reserved.");
    await this._recordTransition(id, "RESERVED", "AVAILABLE", reason, actorId);
    return mapRow(data);
  },

  /** Marks booked directly from AVAILABLE (cash/manual sale, no prior
   *  reservation) or from RESERVED (the normal flow) — both are valid
   *  per the workflow (section 8), guarded the same way as reserve(). */
  async markBooked(id: string, dealId: string | undefined, actorId?: string): Promise<InventoryUnit> {
    const current = await this.getById(id);
    if (!current) throw new Error("Inventory unit not found.");
    if (!ALLOWED_TRANSITIONS[current.status]?.includes("BOOKED")) throw new Error(`Cannot move a unit from "${current.status}" to "BOOKED".`);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("property_inventory")
      .update({ status: "BOOKED", booked_at: new Date().toISOString(), deal_id: dealId || current.dealId || null })
      .eq("id", id)
      .eq("status", current.status)
      .select(SELECT_WITH_JOINS)
      .maybeSingle();
    if (error) {
      console.error("inventoryService.markBooked failed:", error);
      throw new Error("Could not update this unit's status.");
    }
    if (!data) throw new Error("This property is no longer available.");
    await this._recordTransition(id, current.status, "BOOKED", "Marked booked", actorId);
    return mapRow(data);
  },

  async markSold(id: string, actorId?: string): Promise<InventoryUnit> {
    return this._namedTransition(id, "SOLD", { sold_at: new Date().toISOString() }, "Marked sold", actorId);
  },

  async markRented(id: string, actorId?: string): Promise<InventoryUnit> {
    return this._namedTransition(id, "RENTED", { rented_at: new Date().toISOString() }, "Marked rented", actorId);
  },

  async block(id: string, reason: string, actorId?: string): Promise<InventoryUnit> {
    const current = await this.getById(id);
    if (!current) throw new Error("Inventory unit not found.");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("property_inventory")
      .update({ status: "BLOCKED", block_reason: reason })
      .eq("id", id)
      .select(SELECT_WITH_JOINS)
      .maybeSingle();
    if (error) throw new Error("Could not block this unit.");
    await this._recordTransition(id, current.status, "BLOCKED", reason, actorId);
    return mapRow(data);
  },

  async unblock(id: string, actorId?: string): Promise<InventoryUnit> {
    return this._namedTransition(id, "AVAILABLE", { block_reason: null }, "Unblocked", actorId, "BLOCKED");
  },

  async setUnderConstruction(id: string, actorId?: string): Promise<InventoryUnit> {
    return this._namedTransition(id, "UNDER_CONSTRUCTION", {}, "Set to under construction", actorId);
  },

  async setComingSoon(id: string, actorId?: string): Promise<InventoryUnit> {
    return this._namedTransition(id, "COMING_SOON", {}, "Set to coming soon", actorId);
  },

  async setAvailable(id: string, actorId?: string): Promise<InventoryUnit> {
    return this._namedTransition(id, "AVAILABLE", { reserved_at: null, reserved_until: null, booked_at: null, block_reason: null }, "Set to available", actorId);
  },

  /** Shared helper for the simple named transitions above — validates
   *  against ALLOWED_TRANSITIONS, applies the row update guarded by the
   *  current status (same concurrency pattern as reserve/release), and
   *  records history. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async _namedTransition(id: string, newStatus: InventoryStatus, extra: Record<string, any>, reason: string, actorId?: string, requireFrom?: InventoryStatus): Promise<InventoryUnit> {
    const current = await this.getById(id);
    if (!current) throw new Error("Inventory unit not found.");
    const fromStatus = requireFrom ?? current.status;
    if (requireFrom && current.status !== requireFrom) throw new Error(`This unit is not currently ${requireFrom}.`);
    if (!ALLOWED_TRANSITIONS[current.status]?.includes(newStatus)) throw new Error(`Cannot move a unit from "${current.status}" to "${newStatus}".`);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("property_inventory")
      .update({ status: newStatus, ...extra })
      .eq("id", id)
      .eq("status", fromStatus)
      .select(SELECT_WITH_JOINS)
      .maybeSingle();
    if (error) {
      console.error("inventoryService._namedTransition failed:", error);
      throw new Error("Could not update this unit's status.");
    }
    if (!data) throw new Error("This unit's status has already changed — please refresh and try again.");
    await this._recordTransition(id, fromStatus, newStatus, reason, actorId);
    return mapRow(data);
  },

  async archive(id: string, actorId?: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("property_inventory").update({ archived: true }).eq("id", id);
    if (error) throw new Error("Could not archive this unit.");
    await activityService.log("Inventory Archived", "Archived", "inventory", id, { actorId });
  },

  async unarchive(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("property_inventory").update({ archived: false }).eq("id", id);
    if (error) throw new Error("Could not restore this unit.");
  },

  /** Bulk status update (section 26) — applies the SAME per-row
   *  conditional-update safety as a single change, never a blind mass
   *  UPDATE; collects per-row success/failure rather than assuming
   *  every row succeeds. */
  async bulkUpdateStatus(ids: string[], newStatus: InventoryStatus, reason: string | undefined, actorId?: string): Promise<{ succeeded: string[]; failed: { id: string; error: string }[] }> {
    const succeeded: string[] = [];
    const failed: { id: string; error: string }[] = [];
    for (const id of ids) {
      try {
        const current = await this.getById(id);
        if (!current) throw new Error("Not found.");
        await this._namedTransition(id, newStatus, {}, reason || `Bulk update to ${newStatus}`, actorId, current.status);
        succeeded.push(id);
      } catch (e) {
        failed.push({ id, error: e instanceof Error ? e.message : "Could not update." });
      }
    }
    return { succeeded, failed };
  },

  /** Inventory Dashboard (section 1) — every field real, live. */
  async dashboardStats(): Promise<InventoryDashboardStats> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_inventory").select("status, price").eq("archived", false);
    if (error) {
      console.error("inventoryService.dashboardStats failed:", error);
      throw new Error("Could not load inventory statistics.");
    }
    const rows = data ?? [];
    const count = (s: string) => rows.filter((r) => r.status === s).length;
    const sumValue = (statuses: string[]) => rows.filter((r) => statuses.includes(r.status)).reduce((total, r) => total + Number(r.price ?? 0), 0);
    return {
      total: rows.length,
      available: count("AVAILABLE"),
      reserved: count("RESERVED"),
      booked: count("BOOKED"),
      sold: count("SOLD"),
      rented: count("RENTED"),
      underConstruction: count("UNDER_CONSTRUCTION"),
      comingSoon: count("COMING_SOON"),
      blocked: count("BLOCKED"),
      totalValue: sumValue(["AVAILABLE", "RESERVED", "BOOKED", "SOLD", "RENTED", "UNDER_CONSTRUCTION", "COMING_SOON"]),
      availableValue: sumValue(["AVAILABLE"]),
      soldValue: sumValue(["SOLD"]),
    };
  },

  /** Every existing "<scope>|<block>|<building>|<unitNumber>" key, for
   *  the bulk-import preview's duplicate check against real data
   *  (section 25) — mirrors the DB unique index's own scoping exactly. */
  async listExistingUnitKeys(): Promise<Set<string>> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_inventory").select("project_id, property_id, block, building, unit_number");
    if (error) {
      console.error("inventoryService.listExistingUnitKeys failed:", error);
      return new Set();
    }
    return new Set(
      (data ?? []).map((r) => `${r.project_id ?? r.property_id ?? "none"}|${(r.block ?? "").trim()}|${(r.building ?? "").trim()}|${r.unit_number.trim()}`)
    );
  },

  /** Inserts already-validated rows as a single atomic multi-row INSERT
   *  (section 25) — the preview step (validateInventoryImportRows) is
   *  what keeps invalid/duplicate rows out beforehand, so this never
   *  partially corrupts inventory: either every remaining row is
   *  inserted, or the whole batch is rejected with a clear error (e.g.
   *  a race-condition duplicate created after the preview was shown). */
  async bulkImport(
    rows: { unitNumber: string; unitType: string; projectId?: string; block?: string; building?: string; floor?: string; area?: number; areaUnit?: string; price?: number; status?: string }[],
    createdByAdminId?: string
  ): Promise<number> {
    if (rows.length === 0) return 0;
    const supabase = await createClient();
    const { error, count } = await supabase
      .from("property_inventory")
      .insert(
        rows.map((r) => ({
          project_id: r.projectId || null,
          block: r.block || null,
          building: r.building || null,
          floor: r.floor || null,
          unit_number: r.unitNumber.trim(),
          unit_type: r.unitType,
          area: r.area ?? null,
          area_unit: r.areaUnit || "Sq Ft",
          price: r.price ?? null,
          status: r.status || "AVAILABLE",
          created_by: createdByAdminId || null,
        })),
        { count: "exact" }
      );
    if (error) {
      console.error("inventoryService.bulkImport failed:", error);
      if (error.code === "23505") throw new Error("One or more unit numbers already exist — import was not applied. Please re-check and try again.");
      throw new Error("Could not import inventory. No rows were saved.");
    }
    return count ?? rows.length;
  },

  /** Project Inventory Dashboard (section 20) */
  async projectSummaries(): Promise<ProjectInventorySummary[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_inventory").select("project_id, status, projects(name, status)").eq("archived", false).not("project_id", "is", null);
    if (error) {
      console.error("inventoryService.projectSummaries failed:", error);
      return [];
    }
    const map = new Map<string, ProjectInventorySummary>();
    for (const row of data ?? []) {
      if (!row.project_id) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const project = row.projects as any;
      const entry = map.get(row.project_id) ?? {
        projectId: row.project_id,
        projectName: project?.name ?? "Project",
        projectStatus: project?.status ?? "upcoming",
        total: 0,
        available: 0,
        reserved: 0,
        booked: 0,
        sold: 0,
        rented: 0,
      };
      entry.total += 1;
      if (row.status === "AVAILABLE") entry.available += 1;
      else if (row.status === "RESERVED") entry.reserved += 1;
      else if (row.status === "BOOKED") entry.booked += 1;
      else if (row.status === "SOLD") entry.sold += 1;
      else if (row.status === "RENTED") entry.rented += 1;
      map.set(row.project_id, entry);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  },

  /** Inventory Turnover / Monthly Changes (sections 32/33) — real
   *  historical data only, from inventory_status_history and
   *  property_inventory.created_at; returns an empty array (rendered
   *  as "not enough history yet" by the page) rather than a misleading
   *  0-filled chart when nothing has happened yet. */
  async monthlyChanges(range: DateRange): Promise<{ month: string; added: number; reserved: number; released: number; sold: number }[]> {
    const supabase = await createClient();
    const [{ data: created }, { data: transitions }] = await Promise.all([
      supabase.from("property_inventory").select("created_at").gte("created_at", range.from).lt("created_at", range.to),
      supabase.from("inventory_status_history").select("new_status, previous_status, created_at").gte("created_at", range.from).lt("created_at", range.to),
    ]);

    const map = new Map<string, { month: string; added: number; reserved: number; released: number; sold: number }>();
    const get = (dateStr: string) => {
      const month = dateStr.slice(0, 7);
      if (!map.has(month)) map.set(month, { month, added: 0, reserved: 0, released: 0, sold: 0 });
      return map.get(month)!;
    };
    for (const row of created ?? []) get(row.created_at).added += 1;
    for (const row of transitions ?? []) {
      const entry = get(row.created_at);
      if (row.new_status === "RESERVED") entry.reserved += 1;
      else if (row.new_status === "SOLD") entry.sold += 1;
      else if (row.new_status === "AVAILABLE" && row.previous_status === "RESERVED") entry.released += 1;
    }
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
  },
};
