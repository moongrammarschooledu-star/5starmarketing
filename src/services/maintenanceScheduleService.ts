import "server-only";
import { createClient } from "@/lib/supabase/server";
import { maintenanceAuditService } from "./maintenanceAuditService";
import type { MaintenanceSchedule, MaintenanceScheduleInput, ScheduleFrequency } from "@/lib/models/maintenance";

const SELECT = "*, properties(title), maintenance_assets(asset_number), maintenance_vendors(business_name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): MaintenanceSchedule {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.properties?.title ?? undefined,
    assetId: row.asset_id ?? undefined,
    assetNumber: row.maintenance_assets?.asset_number ?? undefined,
    maintenanceType: row.maintenance_type,
    frequency: row.frequency,
    customIntervalDays: row.custom_interval_days ?? undefined,
    lastCompletedDate: row.last_completed_date ?? undefined,
    nextDueDate: row.next_due_date,
    assignedVendorId: row.assigned_vendor_id ?? undefined,
    assignedVendorName: row.maintenance_vendors?.business_name ?? undefined,
    estimatedCost: row.estimated_cost != null ? Number(row.estimated_cost) : undefined,
    notes: row.notes ?? undefined,
    active: !!row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const FREQUENCY_DAYS: Record<Exclude<ScheduleFrequency, "CUSTOM">, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 91,
  BIANNUAL: 182,
  ANNUAL: 365,
};

function computeNextDue(frequency: ScheduleFrequency, customIntervalDays: number | undefined, fromDate: string): string {
  const days = frequency === "CUSTOM" ? customIntervalDays ?? 30 : FREQUENCY_DAYS[frequency];
  const next = new Date(fromDate);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export const maintenanceScheduleService = {
  async list(filters?: { propertyId?: string; activeOnly?: boolean; dueWithinDays?: number }): Promise<MaintenanceSchedule[]> {
    const supabase = await createClient();
    let query = supabase.from("maintenance_schedules").select(SELECT).order("next_due_date", { ascending: true });
    if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters?.activeOnly) query = query.eq("active", true);
    if (filters?.dueWithinDays != null) {
      const cutoff = new Date(Date.now() + filters.dueWithinDays * 86400000).toISOString().slice(0, 10);
      query = query.lte("next_due_date", cutoff);
    }
    const { data, error } = await query;
    if (error) {
      console.error("maintenanceScheduleService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<MaintenanceSchedule | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("maintenance_schedules").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: MaintenanceScheduleInput, actorId: string, actorName: string): Promise<MaintenanceSchedule> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .insert({
        property_id: input.propertyId,
        asset_id: input.assetId || null,
        maintenance_type: input.maintenanceType,
        frequency: input.frequency,
        custom_interval_days: input.customIntervalDays ?? null,
        next_due_date: input.nextDueDate,
        assigned_vendor_id: input.assignedVendorId || null,
        estimated_cost: input.estimatedCost ?? null,
        notes: input.notes || null,
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("maintenanceScheduleService.create failed:", error);
      throw new Error("Could not create this schedule.");
    }
    const schedule = mapRow(data);
    await maintenanceAuditService.log({ entityType: "schedule", entityId: schedule.id, action: "Created", actorId, actorName, newValue: { maintenanceType: schedule.maintenanceType } });
    return schedule;
  },

  async update(id: string, input: Partial<MaintenanceScheduleInput> & { active?: boolean }, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.assetId !== undefined) row.asset_id = input.assetId || null;
    if (input.maintenanceType !== undefined) row.maintenance_type = input.maintenanceType;
    if (input.frequency !== undefined) row.frequency = input.frequency;
    if (input.customIntervalDays !== undefined) row.custom_interval_days = input.customIntervalDays;
    if (input.nextDueDate !== undefined) row.next_due_date = input.nextDueDate;
    if (input.assignedVendorId !== undefined) row.assigned_vendor_id = input.assignedVendorId || null;
    if (input.estimatedCost !== undefined) row.estimated_cost = input.estimatedCost;
    if (input.notes !== undefined) row.notes = input.notes || null;
    if (input.active !== undefined) row.active = input.active;
    const { error } = await supabase.from("maintenance_schedules").update(row).eq("id", id);
    if (error) throw new Error("Could not update this schedule.");
    await maintenanceAuditService.log({ entityType: "schedule", entityId: id, action: "Updated", actorId, actorName });
  },

  /** Marks a preventive maintenance cycle done and rolls the next due
   *  date forward from TODAY (never invented — real completion date). */
  async markCompleted(id: string, actorId: string, actorName: string): Promise<MaintenanceSchedule> {
    const schedule = await this.getById(id);
    if (!schedule) throw new Error("Schedule not found.");
    const today = new Date().toISOString().slice(0, 10);
    const nextDueDate = computeNextDue(schedule.frequency, schedule.customIntervalDays, today);
    const supabase = await createClient();
    const { data, error } = await supabase.from("maintenance_schedules").update({ last_completed_date: today, next_due_date: nextDueDate }).eq("id", id).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not update this schedule.");
    await maintenanceAuditService.log({ entityType: "schedule", entityId: id, action: "Marked completed", actorId, actorName, newValue: { lastCompletedDate: today, nextDueDate } });
    return mapRow(data);
  },

  async remove(id: string, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("maintenance_schedules").delete().eq("id", id);
    if (error) throw new Error("Could not delete this schedule.");
    await maintenanceAuditService.log({ entityType: "schedule", entityId: id, action: "Deleted", actorId, actorName });
  },
};
