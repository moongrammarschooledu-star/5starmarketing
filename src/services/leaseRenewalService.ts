import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rentalAuditService } from "./rentalAuditService";
import { leaseService } from "./leaseService";
import { LEASE_RENEWAL_ALLOWED_TRANSITIONS } from "@/lib/models/rental";
import type { LeaseRenewal, LeaseRenewalInput, RenewalStatus } from "@/lib/models/rental";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const SELECT = "*, leases(lease_number), requester:admin_profiles!lease_renewals_requested_by_fkey(name), approver:admin_profiles!lease_renewals_approved_by_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): LeaseRenewal {
  return {
    id: row.id,
    leaseId: row.lease_id,
    leaseNumber: row.leases?.lease_number ?? undefined,
    oldRent: Number(row.old_rent),
    newRent: Number(row.new_rent),
    oldEndDate: row.old_end_date,
    newEndDate: row.new_end_date,
    changePercent: row.change_percent != null ? Number(row.change_percent) : undefined,
    effectiveDate: row.effective_date,
    status: row.status,
    requestedByName: row.requester?.name ?? undefined,
    requestedByCustomerId: row.requested_by_customer_id ?? undefined,
    approvedByName: row.approver?.name ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    newLeaseDocumentId: row.new_lease_document_id ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertTransition(from: RenewalStatus, to: RenewalStatus) {
  if (!LEASE_RENEWAL_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot move a lease renewal from ${from} to ${to}.`);
  }
}

export const leaseRenewalService = {
  async listForLease(leaseId: string): Promise<LeaseRenewal[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("lease_renewals").select(SELECT).eq("lease_id", leaseId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<LeaseRenewal | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("lease_renewals").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async request(leaseId: string, input: LeaseRenewalInput, actor: { adminId?: string; adminName?: string; customerId?: string }): Promise<LeaseRenewal> {
    const lease = await leaseService.getById(leaseId);
    if (!lease) throw new Error("Lease not found.");
    const changePercent = lease.monthlyRent > 0 ? round2(((input.newRent - lease.monthlyRent) / lease.monthlyRent) * 100) : null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lease_renewals")
      .insert({
        lease_id: leaseId,
        old_rent: lease.monthlyRent,
        new_rent: input.newRent,
        old_end_date: lease.endDate,
        new_end_date: input.newEndDate,
        change_percent: changePercent,
        effective_date: input.effectiveDate,
        requested_by: actor.adminId || null,
        requested_by_customer_id: actor.customerId || null,
        notes: input.notes || null,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("leaseRenewalService.request failed:", error);
      if (error.code === "23514") throw new Error("The new end date must be after the current lease end date.");
      throw new Error("Could not request this renewal.");
    }
    const renewal = mapRow(data);
    await rentalAuditService.log({ entityType: "lease_renewal", entityId: renewal.id, action: "Requested", actorId: actor.adminId, actorName: actor.adminName, newValue: { newRent: renewal.newRent } });
    return renewal;
  },

  /** Section 21 — never auto-increases rent. The lease's own
   *  monthly_rent/end_date are only updated once a renewal reaches
   *  SIGNED, and only by this explicit call. */
  async updateStatus(id: string, status: RenewalStatus, actorId: string, actorName: string): Promise<LeaseRenewal> {
    const renewal = await this.getById(id);
    if (!renewal) throw new Error("Renewal not found.");
    assertTransition(renewal.status, status);

    const supabase = await createClient();
    const row: Record<string, unknown> = { status };
    if (status === "APPROVED") {
      row.approved_by = actorId;
      row.approved_at = new Date().toISOString();
    }
    const { data, error } = await supabase.from("lease_renewals").update(row).eq("id", id).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not update this renewal's status.");

    if (status === "SIGNED") {
      const { error: leaseError } = await supabase.from("leases").update({ monthly_rent: renewal.newRent, end_date: renewal.newEndDate, status: "ACTIVE" }).eq("id", renewal.leaseId);
      if (leaseError) throw new Error("Could not apply the renewed terms to the lease.");
    }

    await rentalAuditService.log({ entityType: "lease_renewal", entityId: id, action: `Status changed to ${status}`, actorId, actorName, oldValue: { status: renewal.status } });
    return mapRow(data);
  },
};
