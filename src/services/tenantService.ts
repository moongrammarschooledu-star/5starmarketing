import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rentalAuditService } from "./rentalAuditService";
import type { Tenant, TenantInput, TenantStatus } from "@/lib/models/rental";

const SELECT = "*, properties(title), property_inventory(unit_number)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Tenant {
  return {
    id: row.id,
    customerId: row.customer_id ?? undefined,
    name: row.name,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    currentPropertyId: row.current_property_id ?? undefined,
    currentPropertyTitle: row.properties?.title ?? undefined,
    currentUnitId: row.current_unit_id ?? undefined,
    currentUnitNumber: row.property_inventory?.unit_number ?? undefined,
    status: row.status,
    emergencyContactName: row.emergency_contact_name ?? undefined,
    emergencyContactPhone: row.emergency_contact_phone ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function attachCustomerNames(tenants: Tenant[]): Promise<Tenant[]> {
  const ids = Array.from(new Set(tenants.map((t) => t.customerId).filter((id): id is string => !!id)));
  if (ids.length === 0) return tenants;
  const supabase = await createClient();
  const { data } = await supabase.from("customer_profiles").select("id, full_name").in("id", ids);
  const names = new Map((data ?? []).map((c) => [c.id, c.full_name as string]));
  return tenants.map((t) => (t.customerId ? { ...t, customerName: names.get(t.customerId) } : t));
}

export const tenantService = {
  async list(filters?: { status?: TenantStatus; q?: string }): Promise<Tenant[]> {
    const supabase = await createClient();
    let query = supabase.from("tenants").select(SELECT).order("created_at", { ascending: false });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.q) {
      const q = filters.q.replace(/[%_]/g, "\\$&");
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
    }
    const { data, error } = await query;
    if (error) {
      console.error("tenantService.list failed:", error);
      return [];
    }
    return attachCustomerNames((data ?? []).map(mapRow));
  },

  async getById(id: string): Promise<Tenant | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("tenants").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    const [tenant] = await attachCustomerNames([mapRow(data)]);
    return tenant;
  },

  async getByCustomerId(customerId: string): Promise<Tenant | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("tenants").select(SELECT).eq("customer_id", customerId).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: TenantInput, actorId: string, actorName: string): Promise<Tenant> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tenants")
      .insert({
        customer_id: input.customerId || null,
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        emergency_contact_name: input.emergencyContactName || null,
        emergency_contact_phone: input.emergencyContactPhone || null,
        notes: input.notes || null,
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("tenantService.create failed:", error);
      if (error.code === "23505") throw new Error("This customer is already registered as a tenant.");
      throw new Error("Could not create this tenant.");
    }
    const tenant = mapRow(data);
    await rentalAuditService.log({ entityType: "tenant", entityId: tenant.id, action: "Created", actorId, actorName, newValue: { name: tenant.name } });
    return tenant;
  },

  async update(id: string, input: Partial<TenantInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.phone !== undefined) row.phone = input.phone || null;
    if (input.email !== undefined) row.email = input.email || null;
    if (input.emergencyContactName !== undefined) row.emergency_contact_name = input.emergencyContactName || null;
    if (input.emergencyContactPhone !== undefined) row.emergency_contact_phone = input.emergencyContactPhone || null;
    if (input.notes !== undefined) row.notes = input.notes || null;
    const { error } = await supabase.from("tenants").update(row).eq("id", id);
    if (error) throw new Error("Could not update this tenant.");
  },

  async setStatus(id: string, status: TenantStatus, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("tenants").update({ status }).eq("id", id);
    if (error) throw new Error("Could not update this tenant's status.");
    await rentalAuditService.log({ entityType: "tenant", entityId: id, action: `Status changed to ${status}`, actorId, actorName });
  },

  async setCurrentProperty(id: string, propertyId: string | null, unitId: string | null): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("tenants").update({ current_property_id: propertyId, current_unit_id: unitId }).eq("id", id);
    if (error) throw new Error("Could not update this tenant's current property.");
  },
};
