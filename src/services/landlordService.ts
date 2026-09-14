import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rentalAuditService } from "./rentalAuditService";
import type { Landlord, LandlordInput, LandlordStatus } from "@/lib/models/rental";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Landlord {
  return {
    id: row.id,
    customerId: row.customer_id ?? undefined,
    name: row.name,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    address: row.address ?? undefined,
    paymentReference: row.payment_reference ?? undefined,
    managementAgreementDocumentId: row.management_agreement_document_id ?? undefined,
    managementFeeType: row.management_fee_type,
    managementFeeValue: Number(row.management_fee_value),
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function attachCustomerNames(landlords: Landlord[]): Promise<Landlord[]> {
  const ids = Array.from(new Set(landlords.map((l) => l.customerId).filter((id): id is string => !!id)));
  if (ids.length === 0) return landlords;
  const supabase = await createClient();
  const { data } = await supabase.from("customer_profiles").select("id, full_name").in("id", ids);
  const names = new Map((data ?? []).map((c) => [c.id, c.full_name as string]));
  return landlords.map((l) => (l.customerId ? { ...l, customerName: names.get(l.customerId) } : l));
}

export const landlordService = {
  async list(filters?: { status?: LandlordStatus; q?: string }): Promise<Landlord[]> {
    const supabase = await createClient();
    let query = supabase.from("landlords").select("*").order("created_at", { ascending: false });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.q) {
      const q = filters.q.replace(/[%_]/g, "\\$&");
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
    }
    const { data, error } = await query;
    if (error) {
      console.error("landlordService.list failed:", error);
      return [];
    }
    return attachCustomerNames((data ?? []).map(mapRow));
  },

  async getById(id: string): Promise<Landlord | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("landlords").select("*").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    const [landlord] = await attachCustomerNames([mapRow(data)]);
    return landlord;
  },

  async getByCustomerId(customerId: string): Promise<Landlord | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("landlords").select("*").eq("customer_id", customerId).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: LandlordInput, actorId: string, actorName: string): Promise<Landlord> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("landlords")
      .insert({
        customer_id: input.customerId || null,
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        payment_reference: input.paymentReference || null,
        management_fee_type: input.managementFeeType ?? "NONE",
        management_fee_value: input.managementFeeValue ?? 0,
        notes: input.notes || null,
        created_by: actorId,
      })
      .select("*")
      .single();
    if (error) {
      console.error("landlordService.create failed:", error);
      if (error.code === "23505") throw new Error("This customer is already registered as a landlord.");
      throw new Error("Could not create this landlord.");
    }
    const landlord = mapRow(data);
    await rentalAuditService.log({ entityType: "landlord", entityId: landlord.id, action: "Created", actorId, actorName, newValue: { name: landlord.name } });
    return landlord;
  },

  async update(id: string, input: Partial<LandlordInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.phone !== undefined) row.phone = input.phone || null;
    if (input.email !== undefined) row.email = input.email || null;
    if (input.address !== undefined) row.address = input.address || null;
    if (input.paymentReference !== undefined) row.payment_reference = input.paymentReference || null;
    if (input.managementFeeType !== undefined) row.management_fee_type = input.managementFeeType;
    if (input.managementFeeValue !== undefined) row.management_fee_value = input.managementFeeValue;
    if (input.notes !== undefined) row.notes = input.notes || null;
    const { error } = await supabase.from("landlords").update(row).eq("id", id);
    if (error) throw new Error("Could not update this landlord.");
  },

  async setStatus(id: string, status: LandlordStatus, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("landlords").update({ status }).eq("id", id);
    if (error) throw new Error("Could not update this landlord's status.");
    await rentalAuditService.log({ entityType: "landlord", entityId: id, action: `Status changed to ${status}`, actorId, actorName });
  },
};
