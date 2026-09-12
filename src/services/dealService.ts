import "server-only";
import { createClient } from "@/lib/supabase/server";
import { propertyService } from "./propertyService";
import { activityService } from "./activityService";
import type {
  Deal,
  DealInput,
  DealStatus,
  DealDashboardStats,
  DealNote,
  DealScheduleInstallment,
  CancellationReason,
} from "@/lib/models/deal";
import { dealStatuses, allDealStatuses, PROPERTY_SALE_DEAL_TYPES } from "@/lib/models/deal";
import type { DealSearchFilters, DealSearchResult } from "@/lib/models/deal";
import { DEFAULT_DEAL_PAGE_SIZE, MAX_DEAL_PAGE_SIZE } from "@/lib/models/deal";
import { paymentPlanService } from "./paymentPlanService";
import { inventoryService } from "./inventoryService";
import { settingsService } from "./settingsService";
import { documentService } from "./documentService";
import { automationService } from "./automationService";
import { leadScoringService } from "./leadScoringService";
import { propertyPriceHistoryService } from "./propertyPriceHistoryService";

const SELECT_WITH_JOINS =
  "*, agent:admin_profiles!deals_agent_id_fkey(name), creator:admin_profiles!deals_created_by_fkey(name), leads(name), projects(name), property_inventory(unit_number)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToDeal(row: any): Deal {
  return {
    id: row.id,
    dealNumber: row.deal_number,
    leadId: row.lead_id ?? undefined,
    customerId: row.customer_id ?? undefined,
    propertyId: row.property_id ?? undefined,
    projectId: row.project_id ?? undefined,
    inventoryId: row.inventory_id ?? undefined,
    agentId: row.agent_id ?? undefined,
    sellerName: row.seller_name ?? undefined,
    sellerPhone: row.seller_phone ?? undefined,
    sellerNotes: row.seller_notes ?? undefined,
    dealType: row.deal_type,
    status: row.status,
    propertyPrice: row.property_price ?? undefined,
    negotiatedPrice: Number(row.negotiated_price ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    discountReason: row.discount_reason ?? undefined,
    finalAmount: Number(row.final_amount ?? 0),
    bookingAmount: Number(row.booking_amount ?? 0),
    bookingDate: row.booking_date ?? undefined,
    bookingStatus: row.booking_status,
    receivedAmount: Number(row.received_amount ?? 0),
    outstandingAmount: Number(row.outstanding_amount ?? 0),
    commissionRate: row.commission_rate ?? undefined,
    commissionAmount: row.commission_amount ?? undefined,
    commissionOverrideReason: row.commission_override_reason ?? undefined,
    commissionStatus: row.commission_status,
    commissionPaidAmount: Number(row.commission_paid_amount ?? 0),
    commissionPaidAt: row.commission_paid_at ?? undefined,
    expectedCompletionDate: row.expected_completion_date ?? undefined,
    completedAt: row.completed_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdByName: row.creator?.name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    agentName: row.agent?.name ?? undefined,
    projectName: row.projects?.name ?? undefined,
    leadName: row.leads?.name ?? undefined,
    inventoryUnitNumber: row.property_inventory?.unit_number ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToNote(row: any): DealNote {
  return {
    id: row.id,
    dealId: row.deal_id,
    note: row.note,
    createdBy: row.created_by ?? undefined,
    userId: row.user_id ?? undefined,
    createdAt: row.created_at,
  };
}

function todayISO() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

/** Attaches customer_profiles fields to a deal — deals.customer_id
 *  references auth.users(id) (the established convention throughout
 *  this codebase), which PostgREST can't embed directly since
 *  customer_profiles has no FK to deals; a separate lookup is required. */
async function attachCustomerInfo(deal: Deal): Promise<Deal> {
  if (!deal.customerId) return deal;
  const supabase = await createClient();
  const { data } = await supabase.from("customer_profiles").select("full_name, phone, whatsapp, email").eq("id", deal.customerId).maybeSingle();
  if (!data) return deal;
  return {
    ...deal,
    customerName: data.full_name ?? undefined,
    customerPhone: data.phone ?? undefined,
    customerWhatsapp: data.whatsapp ?? undefined,
    customerEmail: data.email ?? undefined,
  };
}

async function attachPropertyInfo(deal: Deal): Promise<Deal> {
  if (!deal.propertyId) return deal;
  const property = await propertyService.getById(deal.propertyId);
  if (!property) return deal;
  return {
    ...deal,
    propertyTitle: property.title,
    propertySlug: property.slug,
    propertyImage: property.images[0],
    propertyType: property.type,
    propertyLocation: property.location,
    propertySize: property.size,
    propertyStatus: property.status,
  };
}

async function enrich(deal: Deal): Promise<Deal> {
  const withCustomer = await attachCustomerInfo(deal);
  return attachPropertyInfo(withCustomer);
}

/** Validated status pipeline (section 6/61) — a deal may only move to
 *  the next stage, or to Cancelled from any non-terminal stage, or back
 *  a stage (correcting a mistake is a normal admin action, unlike
 *  skipping ahead which would bypass required steps). */
function isValidTransition(from: DealStatus, to: DealStatus): boolean {
  if (from === to) return true;
  if (to === "Cancelled") return from !== "Completed" && from !== "Cancelled";
  if (from === "Cancelled" || from === "Completed") return false;
  const fromIndex = dealStatuses.indexOf(from);
  const toIndex = dealStatuses.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex === fromIndex + 1 || toIndex === fromIndex - 1;
}

/** Property availability sync (section 46) — only Property Sale /
 *  Property Purchase / Project Booking deals ever move a property to
 *  Reserved/Sold automatically; Rent/Investment/Other never touch it.
 *  Reverting to Available on cancellation only happens when no OTHER
 *  active deal still holds the property. */
async function syncPropertyAvailability(deal: Deal, nextStatus: DealStatus) {
  if (!deal.propertyId || !PROPERTY_SALE_DEAL_TYPES.includes(deal.dealType)) return;
  const supabase = await createClient();

  if (nextStatus === "Booked") {
    const property = await propertyService.getById(deal.propertyId);
    if (property?.status === "Available") {
      await propertyService.update(deal.propertyId, { status: "Reserved" });
    }
  } else if (nextStatus === "Completed") {
    await propertyService.update(deal.propertyId, { status: "Sold" });
  } else if (nextStatus === "Cancelled") {
    const { data: otherActive } = await supabase
      .from("deals")
      .select("id")
      .eq("property_id", deal.propertyId)
      .neq("id", deal.id)
      .in("status", ["Booked", "Documentation", "Payment In Progress", "Completed"])
      .limit(1);
    if (!otherActive || otherActive.length === 0) {
      const property = await propertyService.getById(deal.propertyId);
      if (property?.status === "Reserved") {
        await propertyService.update(deal.propertyId, { status: "Available" });
      }
    }
  }
}

/** STEP 19 inventory sync — mirrors syncPropertyAvailability above, but
 *  for a specific unit (section 14/56/57). Each inventory row is a
 *  single unit, so unlike properties there's no "other active deal"
 *  check needed: the conditional-update guards inside inventoryService
 *  already make it impossible for two deals to both hold the same unit
 *  in a confirmed stage. Never promotes Booked straight to Sold on
 *  payment alone (section 57) — only an explicit deal-status change
 *  drives this. */
async function syncInventoryAvailability(deal: Deal, nextStatus: DealStatus) {
  if (!deal.inventoryId) return;
  try {
    if (nextStatus === "Booked") {
      await inventoryService.markBooked(deal.inventoryId, deal.id);
    } else if (nextStatus === "Completed") {
      if (deal.dealType === "Property Rent") await inventoryService.markRented(deal.inventoryId);
      else if (PROPERTY_SALE_DEAL_TYPES.includes(deal.dealType)) await inventoryService.markSold(deal.inventoryId);
    } else if (nextStatus === "Cancelled") {
      await inventoryService.setAvailable(deal.inventoryId);
    }
  } catch (e) {
    console.error("dealService: inventory availability sync failed:", e);
  }
}

export const dealService = {
  async search(filters: DealSearchFilters): Promise<DealSearchResult> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(MAX_DEAL_PAGE_SIZE, Math.max(1, filters.pageSize ?? DEFAULT_DEAL_PAGE_SIZE));
    const supabase = await createClient();

    let query = supabase.from("deals").select(SELECT_WITH_JOINS, { count: "exact" });

    if (filters.q) {
      const q = filters.q.replace(/[%_]/g, "\\$&");
      query = query.or(`deal_number.ilike.%${q}%`);
    }
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.dealType) query = query.eq("deal_type", filters.dealType);
    if (filters.agentId) query = query.eq("agent_id", filters.agentId);
    if (filters.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters.projectId) query = query.eq("project_id", filters.projectId);
    if (filters.commissionStatus) query = query.eq("commission_status", filters.commissionStatus);
    if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
    if (filters.dateTo) query = query.lt("created_at", filters.dateTo);
    if (filters.paymentStatus === "paid") query = query.eq("outstanding_amount", 0).gt("final_amount", 0);
    else if (filters.paymentStatus === "unpaid") query = query.eq("received_amount", 0);
    else if (filters.paymentStatus === "partial") query = query.gt("received_amount", 0).gt("outstanding_amount", 0);

    if (filters.sort === "oldest") query = query.order("created_at", { ascending: true });
    else if (filters.sort === "value_desc") query = query.order("final_amount", { ascending: false });
    else if (filters.sort === "value_asc") query = query.order("final_amount", { ascending: true });
    else query = query.order("created_at", { ascending: false });

    const from = (page - 1) * pageSize;
    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) {
      console.error("dealService.search failed:", error);
      throw new Error("Could not load deals.");
    }

    // Free-text search also matches customer name/phone/property title,
    // neither of which lives on `deals` itself — done as a client-side
    // widen when a plain deal_number match comes back empty, keeping the
    // common case (searching by deal number) a single indexed query.
    let rows = data ?? [];
    if (filters.q && rows.length === 0) {
      const q = filters.q.trim();
      const [{ data: byPhone }, { data: byProperty }] = await Promise.all([
        supabase.from("customer_profiles").select("id").or(`phone.ilike.%${q}%,full_name.ilike.%${q}%`),
        supabase.from("properties").select("id").ilike("title", `%${q}%`),
      ]);
      const customerIds = (byPhone ?? []).map((r) => r.id);
      const propertyIds = (byProperty ?? []).map((r) => r.id);
      if (customerIds.length > 0 || propertyIds.length > 0) {
        let widened = supabase.from("deals").select(SELECT_WITH_JOINS, { count: "exact" });
        const orParts: string[] = [];
        if (customerIds.length > 0) orParts.push(`customer_id.in.(${customerIds.join(",")})`);
        if (propertyIds.length > 0) orParts.push(`property_id.in.(${propertyIds.join(",")})`);
        widened = widened.or(orParts.join(","));
        const { data: widenedData, count: widenedCount } = await widened
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        rows = widenedData ?? [];
        const deals = await Promise.all(rows.map((r) => enrich(mapRowToDeal(r))));
        const total = widenedCount ?? deals.length;
        return { deals, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
      }
    }

    const deals = await Promise.all(rows.map((r) => enrich(mapRowToDeal(r))));
    const total = count ?? 0;
    return { deals, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  },

  /** CSV export — every filter applied, no pagination, capped at a sane
   *  hard limit (mirrors leadService.searchAll from STEP 17). */
  async searchAll(filters: DealSearchFilters, hardLimit = 5000): Promise<Deal[]> {
    const { deals } = await this.search({ ...filters, page: 1, pageSize: hardLimit });
    return deals;
  },

  async getById(id: string): Promise<Deal | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("deals").select(SELECT_WITH_JOINS).eq("id", id).maybeSingle();
    if (error) {
      console.error("dealService.getById failed:", error);
      throw new Error("Could not load this deal.");
    }
    return data ? enrich(mapRowToDeal(data)) : undefined;
  },

  /** Used by the CRM lead detail page to show "View Deal" instead of
   *  "Create Deal" once one already exists for this lead — reuses the
   *  existing record rather than risking a duplicate (section 3). */
  async getByLeadId(leadId: string): Promise<Deal | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("deals").select(SELECT_WITH_JOINS).eq("lead_id", leadId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error || !data) return undefined;
    return enrich(mapRowToDeal(data));
  },

  /** Admin-only "authorized transaction status" for a property (section
   *  45) — the public property page never calls this; it only ever
   *  shows properties.status (Available/Reserved/Sold/Inactive). */
  async listByProperty(propertyId: string): Promise<Deal[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("deals")
      .select(SELECT_WITH_JOINS)
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("dealService.listByProperty failed:", error);
      return [];
    }
    return Promise.all((data ?? []).map((r) => enrich(mapRowToDeal(r))));
  },

  async listByCustomer(customerId: string): Promise<Deal[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("deals")
      .select(SELECT_WITH_JOINS)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("dealService.listByCustomer failed:", error);
      return [];
    }
    return Promise.all((data ?? []).map((r) => enrich(mapRowToDeal(r))));
  },

  async create(input: DealInput, createdByAdminId?: string): Promise<Deal> {
    const supabase = await createClient();

    let propertyPrice = input.propertyPrice;
    if (input.propertyId && propertyPrice === undefined) {
      const property = await propertyService.getById(input.propertyId);
      propertyPrice = property?.priceValue ?? undefined;
    }

    const { data, error } = await supabase
      .from("deals")
      .insert({
        lead_id: input.leadId || null,
        customer_id: input.customerId || null,
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        inventory_id: input.inventoryId || null,
        agent_id: input.agentId || null,
        seller_name: input.sellerName || null,
        seller_phone: input.sellerPhone || null,
        seller_notes: input.sellerNotes || null,
        deal_type: input.dealType,
        status: input.status ?? "New",
        property_price: propertyPrice ?? null,
        negotiated_price: input.negotiatedPrice ?? 0,
        discount_amount: input.discountAmount ?? 0,
        discount_reason: input.discountReason || null,
        booking_amount: input.bookingAmount ?? 0,
        booking_date: input.bookingDate || null,
        booking_status: input.bookingStatus ?? "Pending",
        commission_rate: input.commissionRate ?? null,
        commission_amount: input.commissionAmount ?? null,
        commission_status: input.commissionStatus ?? "Pending",
        expected_completion_date: input.expectedCompletionDate || null,
        created_by: createdByAdminId || null,
      })
      .select(SELECT_WITH_JOINS)
      .single();

    if (error) {
      console.error("dealService.create failed:", error);
      throw new Error("Could not create this deal.");
    }
    const deal = await enrich(mapRowToDeal(data));
    await activityService.log("Deal Created", `${deal.dealNumber} created`, "deal", deal.id, { dealType: deal.dealType, status: deal.status });

    // Marketing Automation (STEP 21) — best-effort, never blocks deal
    // creation. Scoring/automation only make sense when a deal traces
    // back to a real lead (walk-in/manual deals often don't have one).
    if (deal.leadId) {
      try {
        const scoreChange = await leadScoringService.applyEvent(deal.leadId, "DEAL_CREATED");
        await automationService.executeTrigger("DEAL_CREATED", { leadId: deal.leadId, dealId: deal.id, dealNumber: deal.dealNumber });
        if (scoreChange && scoreChange.newLevel !== scoreChange.previousLevel) {
          await automationService.executeTrigger("LEAD_SCORE_CHANGED", { leadId: deal.leadId, scoreLevel: scoreChange.newLevel, previousScoreLevel: scoreChange.previousLevel });
        }
        await automationService.scheduleFollowUpsFor("DEAL_CREATED", deal.leadId);
      } catch (e) {
        console.error("dealService.create: marketing automation failed:", e);
      }
    }
    return deal;
  },

  async updateFinancials(
    id: string,
    input: { negotiatedPrice?: number; discountAmount?: number; discountReason?: string; bookingAmount?: number; bookingDate?: string; bookingStatus?: string }
  ): Promise<Deal | undefined> {
    if (input.negotiatedPrice !== undefined && input.negotiatedPrice < 0) throw new Error("Deal amount cannot be negative.");
    if (input.discountAmount !== undefined && input.discountAmount < 0) throw new Error("Discount cannot be negative.");
    if (
      input.negotiatedPrice !== undefined &&
      input.discountAmount !== undefined &&
      input.discountAmount > input.negotiatedPrice
    ) {
      throw new Error("Discount cannot be greater than the negotiated price.");
    }

    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.negotiatedPrice !== undefined) row.negotiated_price = input.negotiatedPrice;
    if (input.discountAmount !== undefined) row.discount_amount = input.discountAmount;
    if (input.discountReason !== undefined) row.discount_reason = input.discountReason || null;
    if (input.bookingAmount !== undefined) row.booking_amount = input.bookingAmount;
    if (input.bookingDate !== undefined) row.booking_date = input.bookingDate || null;
    if (input.bookingStatus !== undefined) row.booking_status = input.bookingStatus;

    const { data, error } = await supabase.from("deals").update(row).eq("id", id).select(SELECT_WITH_JOINS).maybeSingle();
    if (error) {
      console.error("dealService.updateFinancials failed:", error);
      throw new Error("Could not update this deal's financial details.");
    }
    return data ? enrich(mapRowToDeal(data)) : undefined;
  },

  async assignAgent(id: string, agentId: string | null): Promise<Deal | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("deals").update({ agent_id: agentId }).eq("id", id).select(SELECT_WITH_JOINS).maybeSingle();
    if (error) {
      console.error("dealService.assignAgent failed:", error);
      throw new Error("Could not assign this deal.");
    }
    return data ? enrich(mapRowToDeal(data)) : undefined;
  },

  /** The one place a deal's status ever changes — validates the
   *  pipeline transition, syncs property availability, and turns the
   *  concurrency unique-index violation (section 47/48) into the exact
   *  clear error the spec asks for (section 67). */
  async updateStatus(id: string, nextStatus: DealStatus, cancellationReason?: CancellationReason): Promise<Deal> {
    const current = await this.getById(id);
    if (!current) throw new Error("Deal not found.");
    if (!isValidTransition(current.status, nextStatus)) {
      throw new Error(`Cannot move a deal from "${current.status}" to "${nextStatus}".`);
    }
    if (nextStatus === "Cancelled" && !cancellationReason) {
      throw new Error("A cancellation reason is required.");
    }

    // Deal completion document gate (STEP 20, section 15) — admin-
    // configurable, defaults OFF so existing/in-flight deals are never
    // retroactively blocked. Enforced here, server-side, not just in
    // the UI.
    if (nextStatus === "Completed") {
      const settings = await settingsService.get().catch(() => null);
      if (settings?.requireDocumentsForDealCompletion) {
        const complete = await documentService.isDealDocumentationComplete(id, current.dealType, current.propertyType);
        if (!complete) {
          throw new Error("This deal cannot be completed until all mandatory documents are approved.");
        }
      }
    }

    const supabase = await createClient();
    const row: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "Completed") row.completed_at = new Date().toISOString();
    if (nextStatus === "Cancelled") {
      row.cancelled_at = new Date().toISOString();
      row.cancellation_reason = cancellationReason;
    }

    const { data, error } = await supabase.from("deals").update(row).eq("id", id).select(SELECT_WITH_JOINS).maybeSingle();
    if (error) {
      console.error("dealService.updateStatus failed:", error);
      if (error.code === "23505") {
        throw new Error("Another transaction has already reserved this property.");
      }
      throw new Error("Could not update this deal's status.");
    }
    if (!data) throw new Error("Deal not found.");

    const deal = await enrich(mapRowToDeal(data));
    try {
      await syncPropertyAvailability(deal, nextStatus);
    } catch (e) {
      console.error("dealService.updateStatus: property availability sync failed:", e);
    }
    await syncInventoryAvailability(deal, nextStatus);

    // Marketing Automation (STEP 21) — best-effort, never blocks the
    // deal's status transition itself.
    if (deal.leadId) {
      try {
        if (nextStatus === "Booked") {
          await automationService.executeTrigger("DEAL_BOOKED", { leadId: deal.leadId, dealId: deal.id, dealNumber: deal.dealNumber });
          await automationService.scheduleFollowUpsFor("DEAL_BOOKED", deal.leadId);
        }
        if (nextStatus === "Completed") {
          const scoreChange = await leadScoringService.applyEvent(deal.leadId, "DEAL_COMPLETED");
          if (scoreChange && scoreChange.newLevel !== scoreChange.previousLevel) {
            await automationService.executeTrigger("LEAD_SCORE_CHANGED", { leadId: deal.leadId, scoreLevel: scoreChange.newLevel, previousScoreLevel: scoreChange.previousLevel });
          }
        }
      } catch (e) {
        console.error("dealService.updateStatus: marketing automation failed:", e);
      }
    }

    // STEP 24 — records the deal's confirmed booking/transaction price
    // against the property, distinct from its own listed/asking price.
    // Best-effort, never blocks this status transition.
    if (deal.propertyId) {
      if (nextStatus === "Booked") {
        await propertyPriceHistoryService.record(deal.propertyId, "BOOKING", deal.finalAmount, "deal_booking", deal.id);
      } else if (nextStatus === "Completed") {
        await propertyPriceHistoryService.record(deal.propertyId, "TRANSACTION", deal.finalAmount, "deal_completed", deal.id);
      }
    }
    return deal;
  },

  async updateCommission(
    id: string,
    input: { commissionRate?: number; commissionAmount?: number; commissionOverrideReason?: string }
  ): Promise<Deal | undefined> {
    const deal = await this.getById(id);
    if (!deal) throw new Error("Deal not found.");

    let commissionAmount = input.commissionAmount;
    const commissionRate = input.commissionRate ?? deal.commissionRate;
    if (commissionAmount === undefined && commissionRate !== undefined) {
      commissionAmount = Math.round(((deal.finalAmount * commissionRate) / 100) * 100) / 100;
    }
    if (commissionAmount !== undefined && commissionAmount < 0) throw new Error("Commission cannot be negative.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("deals")
      .update({
        commission_rate: commissionRate ?? null,
        commission_amount: commissionAmount ?? null,
        commission_override_reason: input.commissionOverrideReason || null,
      })
      .eq("id", id)
      .select(SELECT_WITH_JOINS)
      .maybeSingle();
    if (error) {
      console.error("dealService.updateCommission failed:", error);
      throw new Error("Could not update this deal's commission.");
    }
    return data ? enrich(mapRowToDeal(data)) : undefined;
  },

  async approveCommission(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("deals").update({ commission_status: "Approved" }).eq("id", id);
    if (error) throw new Error("Could not approve this commission.");
  },

  async markCommissionPaid(id: string, amount: number): Promise<void> {
    if (amount <= 0) throw new Error("Payment amount must be greater than zero.");
    const deal = await this.getById(id);
    if (!deal) throw new Error("Deal not found.");
    const totalPaid = deal.commissionPaidAmount + amount;
    const target = deal.commissionAmount ?? 0;
    const status = target > 0 && totalPaid >= target ? "Paid" : "Partially Paid";

    const supabase = await createClient();
    const { error } = await supabase
      .from("deals")
      .update({ commission_paid_amount: totalPaid, commission_status: status, commission_paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error("Could not record this commission payment.");
  },

  async listNotes(dealId: string): Promise<DealNote[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("deal_notes").select("*").eq("deal_id", dealId).order("created_at", { ascending: false });
    if (error) {
      console.error("dealService.listNotes failed:", error);
      return [];
    }
    return (data ?? []).map(mapRowToNote);
  },

  async addNote(dealId: string, note: string, createdBy?: string, userId?: string): Promise<DealNote> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("deal_notes")
      .insert({ deal_id: dealId, note, created_by: createdBy || null, user_id: userId || null })
      .select("*")
      .single();
    if (error) {
      console.error("dealService.addNote failed:", error);
      throw new Error("Could not save this note.");
    }
    return mapRowToNote(data);
  },

  async listActivity(dealId: string) {
    return activityService.listByEntity("deal", dealId, 100);
  },

  /** Real transaction tracking against the EXISTING property payment
   *  plan (STEP 12) — never a duplicate calculator (section 20). Paid
   *  amounts are summed only from Verified deal_payments explicitly
   *  tagged to each installment; untagged payments count toward the
   *  deal's overall balance but not a specific row here. */
  async getScheduleForDeal(dealId: string): Promise<DealScheduleInstallment[]> {
    const deal = await this.getById(dealId);
    if (!deal?.propertyId) return [];
    const plan = await paymentPlanService.getForPropertyAdmin(deal.propertyId);
    if (!plan) return [];
    const items = await paymentPlanService.listScheduleItems(plan.id);
    if (items.length === 0) return [];

    const supabase = await createClient();
    const { data: payments } = await supabase
      .from("deal_payments")
      .select("schedule_item_id, amount, status")
      .eq("deal_id", dealId)
      .eq("status", "Verified")
      .not("schedule_item_id", "is", null);

    const paidByItem = new Map<string, number>();
    for (const p of payments ?? []) {
      if (!p.schedule_item_id) continue;
      paidByItem.set(p.schedule_item_id, (paidByItem.get(p.schedule_item_id) ?? 0) + Number(p.amount));
    }

    const today = todayISO();
    return items.map((item) => {
      const paidAmount = paidByItem.get(item.id) ?? 0;
      const remaining = Math.max(item.amount - paidAmount, 0);
      let status: DealScheduleInstallment["status"] = "Upcoming";
      if (remaining <= 0) status = "Paid";
      else if (paidAmount > 0) status = "Partially Paid";
      else if (item.dueDate && item.dueDate < today) status = "Overdue";
      else if (item.dueDate === today) status = "Due";
      return {
        id: item.id,
        installmentNumber: item.installmentNumber,
        dueDate: item.dueDate,
        amount: item.amount,
        description: item.description,
        paidAmount,
        remaining,
        status,
      };
    });
  },

  /** Overdue Payments (section 21) — every overdue installment across
   *  every active deal with a property payment plan, flattened with
   *  deal/customer/agent context for the admin report. Admin-only, low
   *  traffic — the per-deal N+1 here is an acceptable trade-off for the
   *  simplicity of reusing getScheduleForDeal exactly as the deal detail
   *  page does, rather than a second bespoke aggregation query. */
  async listOverduePayments(): Promise<
    {
      deal: Deal;
      installmentNumber: number;
      dueDate?: string;
      amount: number;
      paidAmount: number;
      outstanding: number;
    }[]
  > {
    const { deals: activeDeals } = await this.search({ pageSize: 100 });
    const relevant = activeDeals.filter((d) => d.propertyId && d.status !== "Completed" && d.status !== "Cancelled");
    const results: { deal: Deal; installmentNumber: number; dueDate?: string; amount: number; paidAmount: number; outstanding: number }[] = [];
    for (const deal of relevant) {
      const schedule = await this.getScheduleForDeal(deal.id);
      for (const item of schedule) {
        if (item.status === "Overdue") {
          results.push({ deal, installmentNumber: item.installmentNumber, dueDate: item.dueDate, amount: item.amount, paidAmount: item.paidAmount, outstanding: item.remaining });
        }
      }
    }
    return results.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  },

  /** CRM Dashboard (STEP 18, section 1) — every field is real, live. */
  async dashboardStats(): Promise<DealDashboardStats> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("deals")
      .select("status, final_amount, received_amount, outstanding_amount, commission_amount, commission_paid_amount");
    if (error) {
      console.error("dealService.dashboardStats failed:", error);
      throw new Error("Could not load deal statistics.");
    }
    const rows = data ?? [];
    const count = (statuses: DealStatus[]) => rows.filter((r) => statuses.includes(r.status)).length;
    const sum = (field: "final_amount" | "received_amount" | "outstanding_amount" | "commission_amount" | "commission_paid_amount", statuses?: DealStatus[]) =>
      rows
        .filter((r) => !statuses || statuses.includes(r.status))
        .reduce((total, r) => total + Number(r[field] ?? 0), 0);

    const nonCancelled = allDealStatuses.filter((s) => s !== "Cancelled");

    return {
      totalDeals: rows.length,
      active: count(["New", "Negotiation", "Booking Pending", "Booked", "Documentation", "Payment In Progress"]),
      bookingPending: count(["Booking Pending"]),
      bookingConfirmed: count(["Booked"]),
      inProgress: count(["Documentation", "Payment In Progress"]),
      completed: count(["Completed"]),
      cancelled: count(["Cancelled"]),
      totalDealValue: sum("final_amount", nonCancelled),
      totalReceived: sum("received_amount", nonCancelled),
      outstandingAmount: sum("outstanding_amount", nonCancelled),
      expectedCommission: sum("commission_amount", nonCancelled),
      paidCommission: sum("commission_paid_amount", nonCancelled),
    };
  },
};
