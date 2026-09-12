import "server-only";
import { createClient } from "@/lib/supabase/server";
import { dealService } from "./dealService";
import { commissionRuleService } from "./commissionRuleService";
import { payableService } from "./payableService";
import { financialTransactionService } from "./financialTransactionService";
import { financialAuditService } from "./financialAuditService";
import { staffNotificationService } from "./staffNotificationService";
import type { AgentCommission, AgentCommissionAdjustment, CommissionSearchFilters, CommissionSearchResult } from "@/lib/models/accounting";
import { DEFAULT_TRANSACTION_PAGE_SIZE, MAX_TRANSACTION_PAGE_SIZE } from "@/lib/models/accounting";

const SELECT =
  "*, admin_profiles!agent_commissions_agent_id_fkey(name), deals(deal_number), properties(title), projects(name), commission_rules(name), approved:admin_profiles!agent_commissions_approved_by_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): AgentCommission {
  return {
    id: row.id,
    commissionNumber: row.commission_number,
    agentId: row.agent_id ?? undefined,
    agentName: row.admin_profiles?.name ?? undefined,
    dealId: row.deal_id,
    dealNumber: row.deals?.deal_number ?? undefined,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    projectId: row.project_id ?? undefined,
    projectName: row.projects?.name ?? undefined,
    commissionRuleId: row.commission_rule_id ?? undefined,
    commissionRuleName: row.commission_rules?.name ?? undefined,
    basis: row.basis,
    basisAmount: Number(row.basis_amount),
    commissionRate: row.commission_rate != null ? Number(row.commission_rate) : undefined,
    commissionAmount: Number(row.commission_amount),
    status: row.status,
    paidAmount: Number(row.paid_amount),
    approvedBy: row.approved_by ?? undefined,
    approvedByName: row.approved?.name ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    paidAt: row.paid_at ?? undefined,
    payableId: row.payable_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const agentCommissionService = {
  async search(filters: CommissionSearchFilters): Promise<CommissionSearchResult> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(MAX_TRANSACTION_PAGE_SIZE, Math.max(1, filters.pageSize ?? DEFAULT_TRANSACTION_PAGE_SIZE));
    const supabase = await createClient();

    let query = supabase.from("agent_commissions").select(SELECT, { count: "exact" });
    if (filters.agentId) query = query.eq("agent_id", filters.agentId);
    if (filters.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters.projectId) query = query.eq("project_id", filters.projectId);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
    if (filters.dateTo) query = query.lte("created_at", filters.dateTo);
    query = query.order("created_at", { ascending: false });

    const from = (page - 1) * pageSize;
    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) {
      console.error("agentCommissionService.search failed:", error);
      throw new Error("Could not load commissions.");
    }
    const total = count ?? 0;
    return { commissions: (data ?? []).map(mapRow), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  },

  async getById(id: string): Promise<AgentCommission | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("agent_commissions").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async getByDeal(dealId: string): Promise<AgentCommission | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("agent_commissions").select(SELECT).eq("deal_id", dealId).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async listAdjustments(commissionId: string): Promise<AgentCommissionAdjustment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("agent_commission_adjustments").select("*, admin_profiles(name)").eq("commission_id", commissionId).order("created_at", { ascending: false });
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({
      id: row.id,
      commissionId: row.commission_id,
      previousAmount: Number(row.previous_amount),
      newAmount: Number(row.new_amount),
      reason: row.reason,
      changedBy: row.changed_by ?? undefined,
      changedByName: row.admin_profiles?.name ?? undefined,
      createdAt: row.created_at,
    }));
  },

  /** Calculates a commission for a deal using an EXPLICITLY chosen rule
   *  (section 27 — never auto-assumed) and writes through to the
   *  existing deals.commission_* columns so every existing consumer
   *  (Deal Financial Tab, sales reports) keeps working unchanged. */
  async calculateForDeal(dealId: string, ruleId: string, actorId: string, actorName: string): Promise<AgentCommission> {
    const existing = await this.getByDeal(dealId);
    if (existing) throw new Error("This deal already has a commission — use Recalculate instead.");

    const deal = await dealService.getById(dealId);
    if (!deal) throw new Error("Deal not found.");
    if (!deal.agentId) throw new Error("This deal has no assigned agent.");

    const rule = await commissionRuleService.getById(ruleId);
    if (!rule) throw new Error("Commission rule not found.");

    const resolved = commissionRuleService.resolveAmount(rule, deal.finalAmount, deal.receivedAmount);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agent_commissions")
      .insert({
        agent_id: deal.agentId,
        deal_id: dealId,
        property_id: deal.propertyId || null,
        project_id: deal.projectId || null,
        commission_rule_id: ruleId,
        basis: rule.basis,
        basis_amount: resolved.basisAmount,
        commission_rate: resolved.rate ?? null,
        commission_amount: resolved.amount,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("agentCommissionService.calculateForDeal failed:", error);
      throw new Error("Could not calculate this commission.");
    }

    await dealService.updateCommission(dealId, { commissionRate: resolved.rate, commissionAmount: resolved.amount });
    await financialAuditService.log({ entityType: "commission", entityId: data.id, action: "Calculated", actorId, actorName, newValue: { rule: rule.name, amount: resolved.amount } });
    return mapRow(data);
  },

  async submitForApproval(id: string, actorId?: string, actorName?: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("agent_commissions").update({ status: "PENDING_APPROVAL" }).eq("id", id).eq("status", "CALCULATED");
    if (error) throw new Error("Could not submit this commission for approval.");
    await financialAuditService.log({ entityType: "commission", entityId: id, action: "Submitted for approval", actorId, actorName });
  },

  /** Approving links a payable (section 55) — the commission becomes
   *  money the business owes its own agent, tracked the same way any
   *  other payable is. */
  async approve(id: string, actorId: string, actorName: string): Promise<AgentCommission> {
    const commission = await this.getById(id);
    if (!commission) throw new Error("Commission not found.");
    if (!["CALCULATED", "PENDING_APPROVAL"].includes(commission.status)) throw new Error("Only a calculated or pending commission can be approved.");

    const payable = await payableService.create(
      { vendor: commission.agentName || "Agent", description: `Commission ${commission.commissionNumber} for deal ${commission.dealNumber}`, amount: commission.commissionAmount, dealId: commission.dealId },
      actorId,
      actorName
    );
    await payableService.approve(payable.id, actorId, actorName);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agent_commissions")
      .update({ status: "APPROVED", approved_by: actorId, approved_at: new Date().toISOString(), payable_id: payable.id })
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw new Error("Could not approve this commission.");

    await dealService.approveCommission(commission.dealId);
    await financialAuditService.log({ entityType: "commission", entityId: id, action: "Approved", actorId, actorName, newValue: { payableId: payable.id } });
    if (commission.agentId) {
      await staffNotificationService.notify(commission.agentId, "commission_approved", "Commission approved", `${commission.commissionNumber} for deal ${commission.dealNumber} was approved.`, "commission", id);
    }
    return mapRow(data);
  },

  /** Records a commission payment — updates the commission, its linked
   *  payable, deals.commission_paid_amount (backward compat), and
   *  writes a CONFIRMED COMMISSION-type financial_transactions row,
   *  exactly per section 55. */
  async recordPayment(id: string, amount: number, actorId: string, actorName: string): Promise<AgentCommission> {
    if (amount <= 0) throw new Error("Payment amount must be greater than zero.");
    const commission = await this.getById(id);
    if (!commission) throw new Error("Commission not found.");
    if (!["APPROVED", "PARTIALLY_PAID"].includes(commission.status)) throw new Error("Only an approved commission can be paid.");
    const remaining = commission.commissionAmount - commission.paidAmount;
    if (amount > remaining) throw new Error(`Payment cannot exceed the outstanding commission of ${remaining}.`);

    const newPaid = commission.paidAmount + amount;
    const status = newPaid >= commission.commissionAmount ? "PAID" : "PARTIALLY_PAID";

    await financialTransactionService.create(
      {
        transactionType: "COMMISSION",
        agentId: commission.agentId,
        dealId: commission.dealId,
        propertyId: commission.propertyId,
        projectId: commission.projectId,
        amount,
        description: `Commission payment for ${commission.commissionNumber} (deal ${commission.dealNumber})`,
        status: "CONFIRMED",
      },
      actorId
    );

    if (commission.payableId) {
      await payableService.recordPayment(commission.payableId, amount, actorId, actorName).catch((e) => console.error("agentCommissionService.recordPayment: payable sync failed:", e));
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agent_commissions")
      .update({ paid_amount: newPaid, status, paid_at: new Date().toISOString() })
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw new Error("Could not record this commission payment.");

    await dealService.markCommissionPaid(commission.dealId, amount);
    await financialAuditService.log({ entityType: "commission", entityId: id, action: "Payment recorded", actorId, actorName, newValue: { amount, newStatus: status } });
    if (commission.agentId && status === "PAID") {
      await staffNotificationService.notify(commission.agentId, "commission_paid", "Commission paid", `${commission.commissionNumber} for deal ${commission.dealNumber} has been paid in full.`, "commission", id);
    }
    return mapRow(data);
  },

  /** Section 30 — never silently overwrites a historical figure; every
   *  recalculation writes an adjustment-history row first. Blocked once
   *  PAID (a correction after payment needs a financial_adjustments
   *  entry instead, preserving what was actually paid). */
  async recalculate(id: string, newAmount: number, reason: string, actorId: string, actorName: string): Promise<AgentCommission> {
    if (newAmount < 0) throw new Error("Commission amount cannot be negative.");
    const commission = await this.getById(id);
    if (!commission) throw new Error("Commission not found.");
    if (commission.status === "PAID") throw new Error("A paid commission cannot be recalculated — record a financial adjustment instead.");
    if (newAmount < commission.paidAmount) throw new Error("The new amount cannot be less than what has already been paid.");
    if (!reason.trim()) throw new Error("A reason is required to recalculate a commission.");

    const supabase = await createClient();
    await supabase.from("agent_commission_adjustments").insert({ commission_id: id, previous_amount: commission.commissionAmount, new_amount: newAmount, reason, changed_by: actorId });

    const status = commission.paidAmount > 0 ? (commission.paidAmount >= newAmount ? "PAID" : "PARTIALLY_PAID") : commission.status;
    const { data, error } = await supabase.from("agent_commissions").update({ commission_amount: newAmount, status }).eq("id", id).select(SELECT).single();
    if (error) throw new Error("Could not recalculate this commission.");

    await dealService.updateCommission(commission.dealId, { commissionAmount: newAmount, commissionOverrideReason: reason });
    await financialAuditService.log({ entityType: "commission", entityId: id, action: "Recalculated", actorId, actorName, oldValue: { amount: commission.commissionAmount }, newValue: { amount: newAmount }, reason });
    return mapRow(data);
  },

  async cancel(id: string, reason: string, actorId?: string, actorName?: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("agent_commissions").update({ status: "CANCELLED" }).eq("id", id).in("status", ["CALCULATED", "PENDING_APPROVAL"]);
    if (error) throw new Error("Could not cancel this commission — it may already be approved or paid.");
    await financialAuditService.log({ entityType: "commission", entityId: id, action: "Cancelled", actorId, actorName, reason });
  },

  /** Agent Financial Tab (section 52) — per-agent rollup across every
   *  commission record, real data only. */
  async summaryForAgent(agentId: string): Promise<{ dealsCount: number; commissionEarned: number; commissionPaid: number; commissionPending: number }> {
    const supabase = await createClient();
    const { data } = await supabase.from("agent_commissions").select("commission_amount, paid_amount, status").eq("agent_id", agentId).neq("status", "CANCELLED");
    const rows = data ?? [];
    const commissionEarned = rows.reduce((t, r) => t + Number(r.commission_amount), 0);
    const commissionPaid = rows.reduce((t, r) => t + Number(r.paid_amount), 0);
    return { dealsCount: rows.length, commissionEarned, commissionPaid, commissionPending: commissionEarned - commissionPaid };
  },
};
