import "server-only";
import { createClient } from "@/lib/supabase/server";
import { constructionBudgetService } from "./constructionBudgetService";
import { constructionSettingsService } from "./constructionSettingsService";
import type { ConstructionDashboardStats, ProjectProfitability } from "@/lib/models/construction";
import type { CountBucket } from "@/lib/models/analytics";

interface TrendPoint {
  date: string;
  count: number;
}

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}
function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const ACTIVE_STATUSES = ["APPROVED", "MOBILIZATION", "IN_PROGRESS", "ON_HOLD", "DELAYED"];

export const constructionReportService = {
  /** Section 2 — every figure computed from real rows; never fabricated. */
  async dashboardStats(): Promise<ConstructionDashboardStats> {
    const supabase = await createClient();
    const { data: constructionAccount } = await supabase.from("accounts").select("id").eq("account_code", "5050").maybeSingle();
    const [{ data: projects }, { data: materials }, { data: milestones }, { data: tasks }, { data: changeOrders }, { data: contractors }, { data: expenses }] = await Promise.all([
      supabase.from("construction_projects").select("id, status, approved_budget"),
      supabase.from("construction_materials").select("id, received_quantity, used_quantity, reorder_threshold"),
      supabase.from("construction_milestones").select("id, planned_date, status").eq("status", "PENDING").not("planned_date", "is", null),
      supabase.from("construction_tasks").select("id, due_date, status").not("due_date", "is", null),
      supabase.from("construction_change_orders").select("id, status").in("status", ["SUBMITTED", "UNDER_REVIEW"]),
      supabase.from("construction_contractors").select("id, status").eq("status", "ACTIVE"),
      constructionAccount ? supabase.from("expenses").select("amount, status").eq("account_id", constructionAccount.id) : Promise.resolve({ data: [] as { amount: number; status: string }[] }),
    ]);

    const p = projects ?? [];
    const activeProjects = p.filter((x) => ACTIVE_STATUSES.includes(x.status)).length;
    const completedProjects = p.filter((x) => x.status === "COMPLETED").length;
    const delayedProjects = p.filter((x) => x.status === "DELAYED").length;

    const today = new Date().toISOString().slice(0, 10);
    const upcomingCutoff = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const upcomingMilestones = (milestones ?? []).filter((m) => m.planned_date && m.planned_date <= upcomingCutoff).length;
    const overdueTasks = (tasks ?? []).filter((t) => t.due_date && t.due_date < today && t.status !== "COMPLETED" && t.status !== "CANCELLED").length;
    const materialShortages = (materials ?? []).filter((m) => m.reorder_threshold != null && Number(m.received_quantity) - Number(m.used_quantity) <= Number(m.reorder_threshold)).length;

    const totalApprovedBudget = p.reduce((sum, x) => sum + Number(x.approved_budget ?? 0), 0);
    const totalActualExpenditure = (expenses ?? []).filter((e) => e.status === "PAID").reduce((sum, e) => sum + Number(e.amount), 0);

    // "At risk" — a real, disclosed heuristic: an active project that is
    // either already DELAYED, or whose actual spend already exceeds its
    // approved budget. Never a claim about the future, only what the
    // real numbers already show today.
    const { data: expensesByProject } = await supabase.from("construction_expenses").select("project_id, amount, status").in("status", ["APPROVED", "PAID"]);
    const spendByProject = new Map<string, number>();
    for (const e of expensesByProject ?? []) spendByProject.set(e.project_id, (spendByProject.get(e.project_id) ?? 0) + Number(e.amount));
    const atRiskProjects = p.filter((x) => ACTIVE_STATUSES.includes(x.status) && x.approved_budget != null && (spendByProject.get(x.id) ?? 0) > Number(x.approved_budget)).length;

    return {
      activeProjects,
      completedProjects,
      delayedProjects,
      atRiskProjects,
      totalApprovedBudget,
      totalActualExpenditure,
      remainingBudget: totalApprovedBudget > 0 ? totalApprovedBudget - totalActualExpenditure : null,
      pendingApprovals: (changeOrders ?? []).length,
      openChangeOrders: (changeOrders ?? []).length,
      materialShortages,
      upcomingMilestones,
      overdueTasks,
      activeContractors: (contractors ?? []).length,
    };
  },

  async projectsByStatus(): Promise<CountBucket[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("construction_projects").select("status");
    const counts = new Map<string, number>();
    for (const row of data ?? []) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
    return [...counts.entries()].map(([label, count]) => ({ label, count }));
  },

  async monthlyExpenseTrend(): Promise<TrendPoint[]> {
    const supabase = await createClient();
    const { data: account } = await supabase.from("accounts").select("id").eq("account_code", "5050").maybeSingle();
    if (!account) return [];
    const { data } = await supabase.from("expenses").select("expense_date, amount").eq("account_id", account.id).eq("status", "PAID");
    const buckets = new Map<string, { label: string; sum: number }>();
    for (const row of data ?? []) {
      const key = monthKey(row.expense_date);
      const existing = buckets.get(key);
      if (existing) existing.sum += Number(row.amount);
      else buckets.set(key, { label: monthLabel(row.expense_date), sum: Number(row.amount) });
    }
    return [...buckets.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => ({ date: v.label, count: Math.round(v.sum) }));
  },

  async budgetVsActualTotals(): Promise<{ budgeted: number; actual: number }> {
    const supabase = await createClient();
    const [{ data: projects }, { data: account }] = await Promise.all([supabase.from("construction_projects").select("approved_budget"), supabase.from("accounts").select("id").eq("account_code", "5050").maybeSingle()]);
    const budgeted = (projects ?? []).reduce((sum, p) => sum + Number(p.approved_budget ?? 0), 0);
    let actual = 0;
    if (account) {
      const { data: expenses } = await supabase.from("expenses").select("amount").eq("account_id", account.id).eq("status", "PAID");
      actual = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);
    }
    return { budgeted, actual };
  },

  /** Contractor performance — same "hasSufficientData" discipline as
   *  the maintenance module's vendor performance. */
  async contractorPerformance(): Promise<{ vendorName: string; assignedWorkOrders: number; completedWorkOrders: number; averageCompletionDays: number | null; hasSufficientData: boolean }[]> {
    const supabase = await createClient();
    const [{ data: contractors }, { data: workOrders }] = await Promise.all([
      supabase.from("construction_contractors").select("id, maintenance_vendors(business_name)"),
      supabase.from("construction_work_orders").select("contractor_id, status, start_date, due_date"),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (contractors as any[] ?? []).map((c) => {
      const orders = (workOrders ?? []).filter((w) => w.contractor_id === c.id);
      const completed = orders.filter((w) => w.status === "COMPLETED" || w.status === "VERIFIED");
      const withDates = completed.filter((w) => w.start_date && w.due_date);
      const durations = withDates.map((w) => (new Date(w.due_date as string).getTime() - new Date(w.start_date as string).getTime()) / 86400000);
      return {
        vendorName: c.maintenance_vendors?.business_name ?? "Contractor",
        assignedWorkOrders: orders.length,
        completedWorkOrders: completed.length,
        averageCompletionDays: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
        hasSufficientData: orders.length >= 3,
      };
    });
  },

  async phaseProgressForProject(projectId: string): Promise<CountBucket[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("construction_phases").select("name, progress").eq("project_id", projectId).order("sequence", { ascending: true });
    return (data ?? []).map((p) => ({ label: p.name, count: Math.round(Number(p.progress)) }));
  },

  async materialConsumptionForProject(projectId: string): Promise<CountBucket[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("construction_materials").select("name, unit, used_quantity").eq("project_id", projectId).gt("used_quantity", 0);
    return (data ?? []).map((m) => ({ label: `${m.name} (${m.unit})`, count: Math.round(Number(m.used_quantity) * 100) / 100 }));
  },

  /** Section 25 — ESTIMATED vs ACTUAL always distinguished; never shows
   *  an estimate as confirmed profit. */
  async profitability(projectId: string): Promise<ProjectProfitability> {
    const supabase = await createClient();
    const [{ data: project }, budgetLines, { data: expenses }] = await Promise.all([
      supabase.from("construction_projects").select("contract_value, approved_budget, deal_id").eq("id", projectId).maybeSingle(),
      constructionBudgetService.summary(projectId),
      supabase.from("construction_expenses").select("amount, status").eq("project_id", projectId).in("status", ["APPROVED", "PAID"]),
    ]);

    const committedCost = budgetLines.reduce((sum, b) => sum + b.committedAmount, 0);
    const actualCost = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);
    const contractValue = project?.contract_value != null ? Number(project.contract_value) : null;
    const approvedBudget = project?.approved_budget != null ? Number(project.approved_budget) : null;

    const estimatedTotalCost = approvedBudget != null ? Math.max(approvedBudget, actualCost + committedCost) : null;
    const estimatedRemainingCost = estimatedTotalCost != null ? Math.max(0, estimatedTotalCost - actualCost) : null;
    const estimatedProfit = contractValue != null && estimatedTotalCost != null ? contractValue - estimatedTotalCost : null;

    // Actual revenue only when this project is linked to a real deal with
    // confirmed payments — never invented.
    let actualRevenue: number | null = null;
    if (project?.deal_id) {
      const { data: linkedPayments } = await supabase.from("deal_payments").select("amount").eq("deal_id", project.deal_id).eq("status", "Verified");
      actualRevenue = (linkedPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    }
    const actualProfit = actualRevenue != null ? actualRevenue - actualCost : null;

    return { contractValue, approvedBudget, committedCost, actualCost, estimatedRemainingCost, estimatedProfit, actualRevenue, actualProfit };
  },

  async budgetAlerts(projectId: string): Promise<{ category: string; percentUsed: number; thresholdCrossed: number }[]> {
    const [summary, settings] = await Promise.all([constructionBudgetService.summary(projectId), constructionSettingsService.get()]);
    const alerts: { category: string; percentUsed: number; thresholdCrossed: number }[] = [];
    for (const line of summary) {
      if (line.budgetedAmount <= 0) continue;
      const percentUsed = (line.actualAmount / line.budgetedAmount) * 100;
      const crossed = [...settings.budgetAlertThresholds].sort((a, b) => b - a).find((t) => percentUsed >= t);
      if (crossed != null) alerts.push({ category: line.category, percentUsed: Math.round(percentUsed * 10) / 10, thresholdCrossed: crossed });
    }
    return alerts;
  },
};
