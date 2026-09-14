import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rentalAuditService } from "./rentalAuditService";
import { RENTAL_APPLICATION_ALLOWED_TRANSITIONS } from "@/lib/models/rental";
import type { RentalApplication, RentalApplicationInput, RentalApplicationStatus } from "@/lib/models/rental";

const SELECT = "*, rental_properties(property_id, properties(title)), reviewer:admin_profiles!rental_applications_reviewed_by_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): RentalApplication {
  return {
    id: row.id,
    applicationNumber: row.application_number,
    rentalPropertyId: row.rental_property_id,
    propertyTitle: row.rental_properties?.properties?.title ?? undefined,
    applicantCustomerId: row.applicant_customer_id ?? undefined,
    applicantName: row.applicant_name,
    applicantPhone: row.applicant_phone ?? undefined,
    applicantEmail: row.applicant_email ?? undefined,
    requestedMoveInDate: row.requested_move_in_date ?? undefined,
    proposedRent: row.proposed_rent != null ? Number(row.proposed_rent) : undefined,
    occupants: row.occupants ?? undefined,
    employmentInfo: row.employment_info ?? undefined,
    monthlyIncome: row.monthly_income != null ? Number(row.monthly_income) : undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    reviewedByName: row.reviewer?.name ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertTransition(from: RentalApplicationStatus, to: RentalApplicationStatus) {
  if (!RENTAL_APPLICATION_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot move a rental application from ${from} to ${to}.`);
  }
}

export const rentalApplicationService = {
  async list(filters?: { rentalPropertyId?: string; status?: RentalApplicationStatus }): Promise<RentalApplication[]> {
    const supabase = await createClient();
    let query = supabase.from("rental_applications").select(SELECT).order("created_at", { ascending: false });
    if (filters?.rentalPropertyId) query = query.eq("rental_property_id", filters.rentalPropertyId);
    if (filters?.status) query = query.eq("status", filters.status);
    const { data, error } = await query;
    if (error) {
      console.error("rentalApplicationService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async listForCustomer(customerId: string): Promise<RentalApplication[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("rental_applications").select(SELECT).eq("applicant_customer_id", customerId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<RentalApplication | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("rental_applications").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: RentalApplicationInput, applicantCustomerId?: string): Promise<RentalApplication> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rental_applications")
      .insert({
        rental_property_id: input.rentalPropertyId,
        applicant_customer_id: applicantCustomerId || null,
        applicant_name: input.applicantName,
        applicant_phone: input.applicantPhone || null,
        applicant_email: input.applicantEmail || null,
        requested_move_in_date: input.requestedMoveInDate || null,
        proposed_rent: input.proposedRent ?? null,
        occupants: input.occupants ?? null,
        employment_info: input.employmentInfo || null,
        monthly_income: input.monthlyIncome ?? null,
        notes: input.notes || null,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("rentalApplicationService.create failed:", error);
      throw new Error("Could not submit this application.");
    }
    const application = mapRow(data);
    await rentalAuditService.log({ entityType: "rental_application", entityId: application.id, action: "Submitted", newValue: { applicantName: application.applicantName } });
    return application;
  },

  async updateStatus(id: string, status: RentalApplicationStatus, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { data: existing } = await supabase.from("rental_applications").select("status").eq("id", id).maybeSingle();
    if (!existing) throw new Error("Application not found.");
    assertTransition(existing.status, status);
    const row: Record<string, unknown> = { status };
    if (status === "UNDER_REVIEW" || status === "APPROVED" || status === "REJECTED") {
      row.reviewed_by = actorId;
      row.reviewed_at = new Date().toISOString();
    }
    const { error } = await supabase.from("rental_applications").update(row).eq("id", id);
    if (error) throw new Error("Could not update this application's status.");
    await rentalAuditService.log({ entityType: "rental_application", entityId: id, action: `Status changed to ${status}`, actorId, actorName, oldValue: { status: existing.status } });
  },

  async withdraw(id: string, applicantCustomerId: string): Promise<void> {
    const supabase = await createClient();
    const { data: existing } = await supabase.from("rental_applications").select("status, applicant_customer_id").eq("id", id).maybeSingle();
    if (!existing || existing.applicant_customer_id !== applicantCustomerId) throw new Error("Application not found.");
    assertTransition(existing.status, "WITHDRAWN");
    const { error } = await supabase.from("rental_applications").update({ status: "WITHDRAWN" }).eq("id", id);
    if (error) throw new Error("Could not withdraw this application.");
  },
};
