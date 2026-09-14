import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rentalAuditService } from "./rentalAuditService";
import type { RentalProperty, RentalPropertyInput, RentalStatus } from "@/lib/models/rental";

const SELECT = "*, properties(title, location), property_inventory(unit_number), landlords(name), manager:admin_profiles!rental_properties_property_manager_id_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): RentalProperty {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.properties?.title ?? undefined,
    propertyLocation: row.properties?.location ?? undefined,
    unitId: row.unit_id ?? undefined,
    unitNumber: row.property_inventory?.unit_number ?? undefined,
    landlordId: row.landlord_id ?? undefined,
    landlordName: row.landlords?.name ?? undefined,
    propertyManagerId: row.property_manager_id ?? undefined,
    propertyManagerName: row.manager?.name ?? undefined,
    rentalStatus: row.rental_status,
    monthlyRent: row.monthly_rent != null ? Number(row.monthly_rent) : undefined,
    securityDepositAmount: row.security_deposit_amount != null ? Number(row.security_deposit_amount) : undefined,
    availableDate: row.available_date ?? undefined,
    furnishedStatus: row.furnished_status,
    utilitiesResponsibility: row.utilities_responsibility,
    maintenanceResponsibility: row.maintenance_responsibility,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const rentalPropertyService = {
  async list(filters?: { rentalStatus?: RentalStatus; landlordId?: string; propertyManagerId?: string }): Promise<RentalProperty[]> {
    const supabase = await createClient();
    let query = supabase.from("rental_properties").select(SELECT).order("created_at", { ascending: false });
    if (filters?.rentalStatus) query = query.eq("rental_status", filters.rentalStatus);
    if (filters?.landlordId) query = query.eq("landlord_id", filters.landlordId);
    if (filters?.propertyManagerId) query = query.eq("property_manager_id", filters.propertyManagerId);
    const { data, error } = await query;
    if (error) {
      console.error("rentalPropertyService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<RentalProperty | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("rental_properties").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async listForLandlord(landlordId: string): Promise<RentalProperty[]> {
    return this.list({ landlordId });
  },

  async create(input: RentalPropertyInput, actorId: string, actorName: string): Promise<RentalProperty> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rental_properties")
      .insert({
        property_id: input.propertyId,
        unit_id: input.unitId || null,
        landlord_id: input.landlordId || null,
        property_manager_id: input.propertyManagerId || null,
        monthly_rent: input.monthlyRent ?? null,
        security_deposit_amount: input.securityDepositAmount ?? null,
        available_date: input.availableDate || null,
        furnished_status: input.furnishedStatus ?? "UNFURNISHED",
        utilities_responsibility: input.utilitiesResponsibility ?? "TENANT",
        maintenance_responsibility: input.maintenanceResponsibility ?? "LANDLORD",
        notes: input.notes || null,
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("rentalPropertyService.create failed:", error);
      if (error.code === "23505") throw new Error("This property/unit is already set up as a rental.");
      throw new Error("Could not create this rental property.");
    }
    const rentalProperty = mapRow(data);
    await rentalAuditService.log({ entityType: "rental_property", entityId: rentalProperty.id, action: "Created", actorId, actorName });
    return rentalProperty;
  },

  async update(id: string, input: Partial<RentalPropertyInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.landlordId !== undefined) row.landlord_id = input.landlordId || null;
    if (input.propertyManagerId !== undefined) row.property_manager_id = input.propertyManagerId || null;
    if (input.monthlyRent !== undefined) row.monthly_rent = input.monthlyRent;
    if (input.securityDepositAmount !== undefined) row.security_deposit_amount = input.securityDepositAmount;
    if (input.availableDate !== undefined) row.available_date = input.availableDate || null;
    if (input.furnishedStatus !== undefined) row.furnished_status = input.furnishedStatus;
    if (input.utilitiesResponsibility !== undefined) row.utilities_responsibility = input.utilitiesResponsibility;
    if (input.maintenanceResponsibility !== undefined) row.maintenance_responsibility = input.maintenanceResponsibility;
    if (input.notes !== undefined) row.notes = input.notes || null;
    const { error } = await supabase.from("rental_properties").update(row).eq("id", id);
    if (error) throw new Error("Could not update this rental property.");
  },

  async setRentalStatus(id: string, status: RentalStatus, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("rental_properties").update({ rental_status: status }).eq("id", id);
    if (error) throw new Error("Could not update this property's rental status.");
    await rentalAuditService.log({ entityType: "rental_property", entityId: id, action: `Rental status changed to ${status}`, actorId, actorName });
  },
};
