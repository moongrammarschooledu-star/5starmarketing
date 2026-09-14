import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rentalAuditService } from "./rentalAuditService";
import { rentalPropertyService } from "./rentalPropertyService";
import { LEASE_ALLOWED_TRANSITIONS } from "@/lib/models/rental";
import type { Lease, LeaseInput, LeaseStatus } from "@/lib/models/rental";

const SELECT =
  "*, rental_properties(property_id, unit_id, properties(title), property_inventory(unit_number)), landlords(name), tenants(name), deals(deal_number)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Lease {
  return {
    id: row.id,
    leaseNumber: row.lease_number,
    rentalPropertyId: row.rental_property_id,
    propertyId: row.rental_properties?.property_id ?? undefined,
    propertyTitle: row.rental_properties?.properties?.title ?? undefined,
    unitId: row.rental_properties?.unit_id ?? undefined,
    unitNumber: row.rental_properties?.property_inventory?.unit_number ?? undefined,
    landlordId: row.landlord_id,
    landlordName: row.landlords?.name ?? undefined,
    tenantId: row.tenant_id,
    tenantName: row.tenants?.name ?? undefined,
    dealId: row.deal_id ?? undefined,
    dealNumber: row.deals?.deal_number ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    monthlyRent: Number(row.monthly_rent),
    securityDeposit: Number(row.security_deposit),
    paymentDueDay: row.payment_due_day,
    gracePeriodDays: row.grace_period_days,
    lateFeeType: row.late_fee_type,
    lateFeeValue: Number(row.late_fee_value),
    utilitiesResponsibility: row.utilities_responsibility,
    maintenanceResponsibility: row.maintenance_responsibility,
    managementFeeType: row.management_fee_type ?? undefined,
    managementFeeValue: row.management_fee_value != null ? Number(row.management_fee_value) : undefined,
    renewalTerms: row.renewal_terms ?? undefined,
    noticePeriodDays: row.notice_period_days,
    status: row.status,
    terminatedAt: row.terminated_at ?? undefined,
    terminationReason: row.termination_reason ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertTransition(from: LeaseStatus, to: LeaseStatus) {
  if (!LEASE_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot move a lease from ${from} to ${to}.`);
  }
}

export const leaseService = {
  async list(filters?: { status?: LeaseStatus; landlordId?: string; tenantId?: string; rentalPropertyId?: string }): Promise<Lease[]> {
    const supabase = await createClient();
    let query = supabase.from("leases").select(SELECT).order("created_at", { ascending: false });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.landlordId) query = query.eq("landlord_id", filters.landlordId);
    if (filters?.tenantId) query = query.eq("tenant_id", filters.tenantId);
    if (filters?.rentalPropertyId) query = query.eq("rental_property_id", filters.rentalPropertyId);
    const { data, error } = await query;
    if (error) {
      console.error("leaseService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<Lease | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("leases").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async listExpiring(withinDays: number): Promise<Lease[]> {
    const supabase = await createClient();
    const limit = new Date();
    limit.setDate(limit.getDate() + withinDays);
    const { data, error } = await supabase
      .from("leases")
      .select(SELECT)
      .in("status", ["ACTIVE", "EXPIRING"])
      .lte("end_date", limit.toISOString().slice(0, 10))
      .order("end_date", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async create(input: LeaseInput, actorId: string, actorName: string): Promise<Lease> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leases")
      .insert({
        rental_property_id: input.rentalPropertyId,
        landlord_id: input.landlordId,
        tenant_id: input.tenantId,
        deal_id: input.dealId || null,
        start_date: input.startDate,
        end_date: input.endDate,
        monthly_rent: input.monthlyRent,
        security_deposit: input.securityDeposit ?? 0,
        payment_due_day: input.paymentDueDay ?? 1,
        grace_period_days: input.gracePeriodDays ?? 0,
        late_fee_type: input.lateFeeType ?? "NONE",
        late_fee_value: input.lateFeeValue ?? 0,
        utilities_responsibility: input.utilitiesResponsibility ?? "TENANT",
        maintenance_responsibility: input.maintenanceResponsibility ?? "LANDLORD",
        management_fee_type: input.managementFeeType || null,
        management_fee_value: input.managementFeeValue ?? null,
        renewal_terms: input.renewalTerms || null,
        notice_period_days: input.noticePeriodDays ?? 30,
        notes: input.notes || null,
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("leaseService.create failed:", error);
      if (error.code === "23505") throw new Error("This rental property already has an active or expiring lease.");
      if (error.code === "23514") throw new Error("The lease end date must be after the start date.");
      throw new Error("Could not create this lease.");
    }
    const lease = mapRow(data);

    // A brand-new deposit record always exists alongside the lease
    // (section 15) — EXPECTED until actually received.
    await supabase.from("security_deposits").insert({
      lease_id: lease.id,
      tenant_id: lease.tenantId,
      rental_property_id: lease.rentalPropertyId,
      amount: lease.securityDeposit,
    });

    await rentalAuditService.log({ entityType: "lease", entityId: lease.id, action: "Created", actorId, actorName, newValue: { monthlyRent: lease.monthlyRent } });
    return lease;
  },

  async update(id: string, input: Partial<Pick<LeaseInput, "lateFeeType" | "lateFeeValue" | "gracePeriodDays" | "renewalTerms" | "notes" | "managementFeeType" | "managementFeeValue">>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.lateFeeType !== undefined) row.late_fee_type = input.lateFeeType;
    if (input.lateFeeValue !== undefined) row.late_fee_value = input.lateFeeValue;
    if (input.gracePeriodDays !== undefined) row.grace_period_days = input.gracePeriodDays;
    if (input.renewalTerms !== undefined) row.renewal_terms = input.renewalTerms || null;
    if (input.notes !== undefined) row.notes = input.notes || null;
    if (input.managementFeeType !== undefined) row.management_fee_type = input.managementFeeType || null;
    if (input.managementFeeValue !== undefined) row.management_fee_value = input.managementFeeValue ?? null;
    const { error } = await supabase.from("leases").update(row).eq("id", id);
    if (error) throw new Error("Could not update this lease.");
  },

  /** Section 8 — enforced transitions, with the real side effects a
   *  lease reaching ACTIVE/TERMINATED/EXPIRED has on the tenant's
   *  status and the unit's real occupancy (property_inventory.status
   *  when this rental is unit-based) — never silently skipped, never
   *  more than what the spec itself asks for. */
  async updateStatus(id: string, newStatus: LeaseStatus, actorId: string, actorName: string, reason?: string): Promise<Lease> {
    const lease = await this.getById(id);
    if (!lease) throw new Error("Lease not found.");
    assertTransition(lease.status, newStatus);

    const supabase = await createClient();
    const row: Record<string, unknown> = { status: newStatus };
    if (newStatus === "TERMINATED") {
      row.terminated_at = new Date().toISOString();
      row.termination_reason = reason || null;
    }
    const { data, error } = await supabase.from("leases").update(row).eq("id", id).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not update this lease's status.");

    const rentalProperty = await rentalPropertyService.getById(lease.rentalPropertyId);
    if (newStatus === "ACTIVE") {
      await rentalPropertyService.setRentalStatus(lease.rentalPropertyId, "OCCUPIED", actorId, actorName);
      await supabase.from("tenants").update({ status: "ACTIVE", current_property_id: rentalProperty?.propertyId ?? null, current_unit_id: rentalProperty?.unitId ?? null }).eq("id", lease.tenantId);
      if (rentalProperty?.unitId) {
        const { data: tenantRow } = await supabase.from("tenants").select("customer_id").eq("id", lease.tenantId).maybeSingle();
        await supabase.from("property_inventory").update({ status: "RENTED", rented_at: new Date().toISOString(), customer_id: tenantRow?.customer_id ?? null }).eq("id", rentalProperty.unitId);
      }
    } else if (newStatus === "TERMINATED" || newStatus === "EXPIRED") {
      await rentalPropertyService.setRentalStatus(lease.rentalPropertyId, "VACANT", actorId, actorName);
      await supabase.from("tenants").update({ status: newStatus === "TERMINATED" ? "MOVED_OUT" : "EXPIRED" }).eq("id", lease.tenantId);
      if (rentalProperty?.unitId) {
        await supabase.from("property_inventory").update({ status: "AVAILABLE" }).eq("id", rentalProperty.unitId);
      }
    }

    await rentalAuditService.log({ entityType: "lease", entityId: id, action: `Status changed to ${newStatus}`, actorId, actorName, oldValue: { status: lease.status }, reason });
    return mapRow(data);
  },
};
