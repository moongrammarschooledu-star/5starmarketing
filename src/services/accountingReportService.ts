import "server-only";
import { createClient } from "@/lib/supabase/server";
import { receivableService } from "./receivableService";
import type { AccountingDashboardStats, DealProfitability, PropertyProfitability, ProjectProfitability, AgentFinancialSummary } from "@/lib/models/accounting";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function monthStartISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export const accountingReportService = {
  /** Every figure here comes from real CONFIRMED transactions / real
   *  deal records — nothing is estimated or fabricated (section 3). */
  async dashboardStats(): Promise<AccountingDashboardStats> {
    const supabase = await createClient();
    const today = todayISO();
    const monthStart = monthStartISO();

    const [{ data: txns }, { data: monthTxns }, { data: todayTxns }, receivables, { data: pendingCommissions }, { data: bestProperty }, { data: bestProject }, { data: topAgent }] = await Promise.all([
      supabase.from("financial_transactions").select("transaction_type, amount").eq("status", "CONFIRMED"),
      supabase.from("financial_transactions").select("transaction_type, amount").eq("status", "CONFIRMED").gte("transaction_date", monthStart),
      supabase.from("financial_transactions").select("amount").eq("status", "CONFIRMED").eq("transaction_type", "INCOME").eq("transaction_date", today),
      receivableService.list(),
      supabase.from("agent_commissions").select("commission_amount, paid_amount").in("status", ["CALCULATED", "PENDING_APPROVAL", "APPROVED", "PARTIALLY_PAID"]),
      supabase.from("deals").select("property_id, final_amount, properties(title)").not("property_id", "is", null).neq("status", "Cancelled"),
      supabase.from("deals").select("project_id, final_amount, projects(name)").not("project_id", "is", null).neq("status", "Cancelled"),
      supabase.from("agent_commissions").select("agent_id, commission_amount, admin_profiles(name)").neq("status", "CANCELLED"),
    ]);

    const rows = txns ?? [];
    const sumType = (type: string, source = rows) => source.filter((r) => r.transaction_type === type).reduce((t, r) => t + Number(r.amount), 0);
    const totalRevenue = sumType("INCOME");
    const totalExpenses = sumType("EXPENSE");
    const agentCommissions = sumType("COMMISSION");
    const grossProfit = totalRevenue - totalExpenses;
    const netProfit = grossProfit - agentCommissions;

    const monthRows = monthTxns ?? [];
    const thisMonthRevenue = monthRows.filter((r) => r.transaction_type === "INCOME").reduce((t, r) => t + Number(r.amount), 0);
    const thisMonthExpenses = monthRows.filter((r) => r.transaction_type === "EXPENSE").reduce((t, r) => t + Number(r.amount), 0);
    const todaysCollection = (todayTxns ?? []).reduce((t, r) => t + Number(r.amount), 0);

    const outstandingReceivables = receivables.reduce((t, r) => t + r.outstandingAmount, 0);
    const overdue = receivables.filter((r) => r.status === "OVERDUE");

    const pendingComm = pendingCommissions ?? [];
    const pendingCommissionsAmount = pendingComm.reduce((t, r) => t + (Number(r.commission_amount) - Number(r.paid_amount)), 0);
    const commissionsPaidRows = rows.filter((r) => r.transaction_type === "COMMISSION");
    const commissionsPaid = commissionsPaidRows.reduce((t, r) => t + Number(r.amount), 0);

    // Best-performing property/project by total deal value (real data,
    // not fabricated — deliberately simple: highest gross booked value).
    const propertyTotals = new Map<string, { title: string; total: number }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const d of (bestProperty ?? []) as any[]) {
      if (!d.property_id) continue;
      const existing = propertyTotals.get(d.property_id) ?? { title: d.properties?.title ?? "Unknown", total: 0 };
      existing.total += Number(d.final_amount);
      propertyTotals.set(d.property_id, existing);
    }
    const bestPerformingPropertyTitle = [...propertyTotals.values()].sort((a, b) => b.total - a.total)[0]?.title;

    const projectTotals = new Map<string, { name: string; total: number }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const d of (bestProject ?? []) as any[]) {
      if (!d.project_id) continue;
      const existing = projectTotals.get(d.project_id) ?? { name: d.projects?.name ?? "Unknown", total: 0 };
      existing.total += Number(d.final_amount);
      projectTotals.set(d.project_id, existing);
    }
    const bestPerformingProjectName = [...projectTotals.values()].sort((a, b) => b.total - a.total)[0]?.name;

    const agentTotals = new Map<string, { name: string; total: number }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const c of (topAgent ?? []) as any[]) {
      if (!c.agent_id) continue;
      const existing = agentTotals.get(c.agent_id) ?? { name: c.admin_profiles?.name ?? "Unknown", total: 0 };
      existing.total += Number(c.commission_amount);
      agentTotals.set(c.agent_id, existing);
    }
    const topAgentName = [...agentTotals.values()].sort((a, b) => b.total - a.total)[0]?.name;

    return {
      totalRevenue,
      collectedRevenue: totalRevenue,
      outstandingReceivables,
      totalExpenses,
      agentCommissions,
      commissionsPaid,
      grossProfit,
      netProfit,
      cashInflow: totalRevenue,
      cashOutflow: totalExpenses + agentCommissions,
      netCashFlow: totalRevenue - totalExpenses - agentCommissions,
      todaysCollection,
      thisMonthRevenue,
      thisMonthExpenses,
      overdueReceivablesCount: overdue.length,
      overdueReceivablesAmount: overdue.reduce((t, r) => t + r.outstandingAmount, 0),
      pendingCommissionsCount: pendingComm.length,
      pendingCommissionsAmount,
      bestPerformingPropertyTitle,
      bestPerformingProjectName,
      topAgentName,
    };
  },

  /** Section 33 — revenue minus direct costs minus allocated expenses
   *  minus commission. "Allocated expenses" are simply the sum of
   *  expenses tagged to this deal — never estimated. */
  async dealProfitability(dealId: string): Promise<DealProfitability> {
    const supabase = await createClient();
    const [{ data: deal }, { data: expenses }, { data: commission }] = await Promise.all([
      supabase.from("deals").select("deal_number, final_amount, received_amount, status").eq("id", dealId).maybeSingle(),
      supabase.from("expenses").select("amount").eq("deal_id", dealId).eq("status", "PAID"),
      supabase.from("agent_commissions").select("commission_amount").eq("deal_id", dealId).neq("status", "CANCELLED").maybeSingle(),
    ]);
    if (!deal) throw new Error("Deal not found.");

    const revenue = Number(deal.received_amount);
    const allocatedExpenses = (expenses ?? []).reduce((t, e) => t + Number(e.amount), 0);
    const commissionAmount = commission ? Number(commission.commission_amount) : 0;
    const netProfit = revenue - allocatedExpenses - commissionAmount;

    return {
      dealId,
      dealNumber: deal.deal_number,
      revenue,
      directCosts: 0,
      allocatedExpenses,
      commission: commissionAmount,
      netProfit,
      isEstimate: deal.status !== "Completed",
    };
  },

  /** Section 34 — shows "Insufficient cost data" (via hasSufficientData)
   *  rather than inventing a cost figure when nothing has been logged. */
  async propertyProfitability(propertyId: string): Promise<PropertyProfitability> {
    const supabase = await createClient();
    const [{ data: property }, { data: deals }, { data: expenses }, { data: commissions }] = await Promise.all([
      supabase.from("properties").select("title").eq("id", propertyId).maybeSingle(),
      supabase.from("deals").select("id, received_amount").eq("property_id", propertyId).neq("status", "Cancelled"),
      supabase.from("expenses").select("amount, account_id, accounts(name)").eq("property_id", propertyId).eq("status", "PAID"),
      supabase.from("agent_commissions").select("commission_amount").eq("property_id", propertyId).neq("status", "CANCELLED"),
    ]);
    if (!property) throw new Error("Property not found.");

    const saleRevenue = (deals ?? []).reduce((t, d) => t + Number(d.received_amount), 0);
    const expenseRows = expenses ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const marketingCost = expenseRows.filter((e: any) => e.accounts?.name === "Marketing").reduce((t, e) => t + Number(e.amount), 0);
    const costs = expenseRows.reduce((t, e) => t + Number(e.amount), 0);
    const commission = (commissions ?? []).reduce((t, c) => t + Number(c.commission_amount), 0);

    return {
      propertyId,
      propertyTitle: property.title,
      saleRevenue,
      costs,
      marketingCost,
      commission,
      profit: saleRevenue - costs - commission,
      hasSufficientData: expenseRows.length > 0 || (deals ?? []).length > 0,
    };
  },

  /** Section 35 — ESTIMATED (using deal final_amount, i.e. booked
   *  value) vs. REALIZED (using deal received_amount, i.e. actual cash)
   *  are always shown as two distinct figures, never blended. */
  async projectProfitability(projectId: string): Promise<ProjectProfitability> {
    const supabase = await createClient();
    const [{ data: project }, { data: deals }, { data: expenses }, { data: commissions }] = await Promise.all([
      supabase.from("projects").select("name").eq("id", projectId).maybeSingle(),
      supabase.from("deals").select("final_amount, received_amount, outstanding_amount").eq("project_id", projectId).neq("status", "Cancelled"),
      supabase.from("expenses").select("amount").eq("project_id", projectId).eq("status", "PAID"),
      supabase.from("agent_commissions").select("commission_amount").eq("project_id", projectId).neq("status", "CANCELLED"),
    ]);
    if (!project) throw new Error("Project not found.");

    const dealRows = deals ?? [];
    const totalSales = dealRows.reduce((t, d) => t + Number(d.final_amount), 0);
    const collected = dealRows.reduce((t, d) => t + Number(d.received_amount), 0);
    const outstanding = dealRows.reduce((t, d) => t + Number(d.outstanding_amount), 0);
    const projectExpenses = (expenses ?? []).reduce((t, e) => t + Number(e.amount), 0);
    const commissionTotal = (commissions ?? []).reduce((t, c) => t + Number(c.commission_amount), 0);

    return {
      projectId,
      projectName: project.name,
      totalSales,
      collected,
      outstanding,
      projectExpenses,
      commissions: commissionTotal,
      estimatedProfit: totalSales - projectExpenses - commissionTotal,
      realizedProfit: collected - projectExpenses - commissionTotal,
    };
  },

  /** Section 52's non-commission figures (deals/sales value/collected
   *  value) — commission figures reuse agentCommissionService. */
  async agentFinancialSummary(agentId: string, agentName: string): Promise<Pick<AgentFinancialSummary, "agentId" | "agentName" | "dealsCount" | "salesValue" | "collectedValue">> {
    const supabase = await createClient();
    const { data } = await supabase.from("deals").select("final_amount, received_amount").eq("agent_id", agentId).neq("status", "Cancelled");
    const rows = data ?? [];
    return {
      agentId,
      agentName,
      dealsCount: rows.length,
      salesValue: rows.reduce((t, r) => t + Number(r.final_amount), 0),
      collectedValue: rows.reduce((t, r) => t + Number(r.received_amount), 0),
    };
  },
};
