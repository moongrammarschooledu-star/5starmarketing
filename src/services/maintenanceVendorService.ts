import "server-only";
import { createClient } from "@/lib/supabase/server";
import { maintenanceAuditService } from "./maintenanceAuditService";
import type { MaintenanceVendor, MaintenanceVendorInput, VendorStatus } from "@/lib/models/maintenance";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): MaintenanceVendor {
  return {
    id: row.id,
    businessName: row.business_name,
    contactPerson: row.contact_person ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    address: row.address ?? undefined,
    serviceCategories: row.service_categories ?? [],
    coverageAreas: row.coverage_areas ?? [],
    status: row.status,
    notes: row.notes ?? undefined,
    rating: row.rating != null ? Number(row.rating) : undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const maintenanceVendorService = {
  async list(activeOnly = false): Promise<MaintenanceVendor[]> {
    const supabase = await createClient();
    let query = supabase.from("maintenance_vendors").select("*").order("business_name", { ascending: true });
    if (activeOnly) query = query.eq("status", "ACTIVE");
    const { data, error } = await query;
    if (error) {
      console.error("maintenanceVendorService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<MaintenanceVendor | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("maintenance_vendors").select("*").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: MaintenanceVendorInput, actorId: string, actorName: string): Promise<MaintenanceVendor> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("maintenance_vendors")
      .insert({
        business_name: input.businessName,
        contact_person: input.contactPerson || null,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        service_categories: input.serviceCategories ?? [],
        coverage_areas: input.coverageAreas ?? [],
        status: input.status ?? "ACTIVE",
        notes: input.notes || null,
        created_by: actorId,
      })
      .select("*")
      .single();
    if (error) {
      console.error("maintenanceVendorService.create failed:", error);
      throw new Error("Could not create this vendor.");
    }
    const vendor = mapRow(data);
    await maintenanceAuditService.log({ entityType: "vendor", entityId: vendor.id, action: "Created", actorId, actorName, newValue: { businessName: vendor.businessName } });
    return vendor;
  },

  async update(id: string, input: Partial<MaintenanceVendorInput>, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.businessName !== undefined) row.business_name = input.businessName;
    if (input.contactPerson !== undefined) row.contact_person = input.contactPerson || null;
    if (input.phone !== undefined) row.phone = input.phone || null;
    if (input.email !== undefined) row.email = input.email || null;
    if (input.address !== undefined) row.address = input.address || null;
    if (input.serviceCategories !== undefined) row.service_categories = input.serviceCategories;
    if (input.coverageAreas !== undefined) row.coverage_areas = input.coverageAreas;
    if (input.status !== undefined) row.status = input.status;
    if (input.notes !== undefined) row.notes = input.notes || null;
    const { error } = await supabase.from("maintenance_vendors").update(row).eq("id", id);
    if (error) throw new Error("Could not update this vendor.");
    await maintenanceAuditService.log({ entityType: "vendor", entityId: id, action: "Updated", actorId, actorName });
  },

  async setStatus(id: string, status: VendorStatus, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("maintenance_vendors").update({ status }).eq("id", id);
    if (error) throw new Error("Could not update this vendor's status.");
    await maintenanceAuditService.log({ entityType: "vendor", entityId: id, action: `Status changed to ${status}`, actorId, actorName });
  },

  async setRating(id: string, rating: number): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("maintenance_vendors").update({ rating }).eq("id", id);
    if (error) throw new Error("Could not update this vendor's rating.");
  },
};
