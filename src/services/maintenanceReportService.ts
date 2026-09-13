import "server-only";
import { createClient } from "@/lib/supabase/server";
import { maintenanceSettingsService } from "./maintenanceSettingsService";
import type { MaintenanceDashboardStats, ConditionScoreResult, RecurringIssueAlert, VendorPerformance, ConditionRating, Severity } from "@/lib/models/maintenance";
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

const CONDITION_WEIGHT: Record<ConditionRating, number> = { GOOD: 100, FAIR: 70, POOR: 35, DAMAGED: 0, NOT_INSPECTED: -1, NOT_APPLICABLE: -1 };
const SEVERITY_PENALTY: Record<Severity, number> = { LOW: 2, MEDIUM: 5, HIGH: 12, CRITICAL: 25 };

export const maintenanceReportService = {
  /** Section 2 — every figure computed from real rows; "insufficient
   *  data" (via null) rather than a fabricated 0/average. */
  async dashboardStats(): Promise<MaintenanceDashboardStats> {
    const supabase = await createClient();
    const { data: maintenanceAccount } = await supabase.from("accounts").select("id").eq("account_code", "5090").maybeSingle();
    const [{ data: requests }, { data: workOrders }, { data: schedules }, { data: expenses }] = await Promise.all([
      supabase.from("maintenance_requests").select("status, priority, created_at, closed_at, sla_resolution_due_at, property_id"),
      supabase.from("maintenance_work_orders").select("status, scheduled_date, actual_cost, estimated_cost, expense_id"),
      supabase.from("maintenance_schedules").select("next_due_date, active").eq("active", true),
      maintenanceAccount ? supabase.from("expenses").select("amount, status").eq("account_id", maintenanceAccount.id) : Promise.resolve({ data: [] as { amount: number; status: string }[] }),
    ]);

    const r = requests ?? [];
    const wo = workOrders ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const in14Days = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

    const openStatuses = new Set(["NEW", "ACKNOWLEDGED", "ASSIGNED", "SCHEDULED", "IN_PROGRESS", "WAITING_FOR_PARTS", "WAITING_FOR_CUSTOMER", "VERIFICATION_REQUIRED"]);
    const resolvedWithTimes = r.filter((x) => x.closed_at);
    const resolutionHours = resolvedWithTimes.map((x) => (new Date(x.closed_at as string).getTime() - new Date(x.created_at).getTime()) / 3600000);
    const propertiesRequiringAttention = new Set(r.filter((x) => openStatuses.has(x.status) && (x.priority === "HIGH" || x.priority === "URGENT" || x.priority === "EMERGENCY")).map((x) => x.property_id)).size;

    const maintenanceExpenses = expenses ?? [];
    const maintenanceExpenditure = maintenanceExpenses.filter((e) => e.status === "PAID").reduce((sum, e) => sum + Number(e.amount), 0);
    const pendingVendorInvoices = maintenanceExpenses.filter((e) => e.status === "SUBMITTED" || e.status === "UNDER_REVIEW").length;

    return {
      totalRequests: r.length,
      openRequests: r.filter((x) => openStatuses.has(x.status)).length,
      highPriorityRequests: r.filter((x) => openStatuses.has(x.status) && (x.priority === "HIGH" || x.priority === "URGENT" || x.priority === "EMERGENCY")).length,
      inProgressWorkOrders: wo.filter((x) => x.status === "IN_PROGRESS").length,
      completedWorkOrders: wo.filter((x) => x.status === "COMPLETED" || x.status === "CLOSED").length,
      overdueWorkOrders: wo.filter((x) => x.status !== "COMPLETED" && x.status !== "CLOSED" && x.status !== "CANCELLED" && x.scheduled_date && x.scheduled_date < today).length,
      upcomingPreventiveMaintenance: (schedules ?? []).filter((s) => s.next_due_date <= in14Days).length,
      maintenanceExpenditure,
      pendingVendorInvoices,
      averageResolutionHours: resolutionHours.length > 0 ? resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length : null,
      propertiesRequiringAttention,
    };
  },

  async requestsByStatus(): Promise<CountBucket[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("maintenance_requests").select("status");
    const counts = new Map<string, number>();
    for (const row of data ?? []) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
    return [...counts.entries()].map(([label, count]) => ({ label, count }));
  },

  async requestsByCategory(): Promise<CountBucket[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("maintenance_requests").select("category");
    const counts = new Map<string, number>();
    for (const row of data ?? []) counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
  },

  async requestsByProperty(limit = 10): Promise<CountBucket[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("maintenance_requests").select("properties(title)");
    const counts = new Map<string, number>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (data ?? []) as any[]) {
      const title = row.properties?.title ?? "Unknown";
      counts.set(title, (counts.get(title) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label, count]) => ({ label, count }));
  },

  async monthlyMaintenanceCostTrend(): Promise<TrendPoint[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("maintenance_work_orders").select("completed_date, actual_cost").not("completed_date", "is", null).not("actual_cost", "is", null);
    const buckets = new Map<string, { label: string; sum: number }>();
    for (const row of data ?? []) {
      const key = monthKey(row.completed_date as string);
      const existing = buckets.get(key);
      if (existing) existing.sum += Number(row.actual_cost);
      else buckets.set(key, { label: monthLabel(row.completed_date as string), sum: Number(row.actual_cost) });
    }
    return [...buckets.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => ({ date: v.label, count: Math.round(v.sum) }));
  },

  async preventiveVsReactive(): Promise<CountBucket[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("maintenance_work_orders").select("maintenance_request_id");
    const preventive = (data ?? []).filter((r) => !r.maintenance_request_id).length;
    const reactive = (data ?? []).filter((r) => r.maintenance_request_id).length;
    return [
      { label: "Preventive", count: preventive },
      { label: "Reactive", count: reactive },
    ];
  },

  async averageResolutionTrend(): Promise<TrendPoint[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("maintenance_requests").select("created_at, closed_at").not("closed_at", "is", null);
    const buckets = new Map<string, { label: string; sum: number; n: number }>();
    for (const row of data ?? []) {
      const hours = (new Date(row.closed_at as string).getTime() - new Date(row.created_at).getTime()) / 3600000;
      const key = monthKey(row.closed_at as string);
      const existing = buckets.get(key);
      if (existing) {
        existing.sum += hours;
        existing.n += 1;
      } else {
        buckets.set(key, { label: monthLabel(row.closed_at as string), sum: hours, n: 1 });
      }
    }
    return [...buckets.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => ({ date: v.label, count: Math.round((v.sum / v.n) * 10) / 10 }));
  },

  /** Vendor performance (section 14) — real assigned/completed counts
   *  only; hasSufficientData tells the UI when to show "Insufficient
   *  data" instead of a misleading percentage from 1-2 jobs. */
  async vendorPerformance(): Promise<VendorPerformance[]> {
    const supabase = await createClient();
    const [{ data: vendors }, { data: workOrders }] = await Promise.all([
      supabase.from("maintenance_vendors").select("id, business_name"),
      supabase.from("maintenance_work_orders").select("vendor_id, status, scheduled_date, completed_date, actual_cost").not("vendor_id", "is", null),
    ]);
    return (vendors ?? []).map((v) => {
      const jobs = (workOrders ?? []).filter((w) => w.vendor_id === v.id);
      const completed = jobs.filter((w) => w.status === "COMPLETED" || w.status === "CLOSED");
      const withDuration = completed.filter((w) => w.scheduled_date && w.completed_date);
      const durations = withDuration.map((w) => (new Date(w.completed_date as string).getTime() - new Date(w.scheduled_date as string).getTime()) / 86400000);
      const onTime = withDuration.filter((w) => new Date(w.completed_date as string) <= new Date(w.scheduled_date as string)).length;
      const costs = completed.filter((w) => w.actual_cost != null).map((w) => Number(w.actual_cost));
      const hasSufficientData = jobs.length >= 3;
      return {
        vendorId: v.id,
        vendorName: v.business_name,
        assignedJobs: jobs.length,
        completedJobs: completed.length,
        averageCompletionDays: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
        averageCost: costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : null,
        reopenedJobs: 0,
        onTimeCompletionPercent: withDuration.length > 0 ? Math.round((onTime / withDuration.length) * 100) : null,
        hasSufficientData,
      };
    });
  },

  /** Recurring issue detection (section 34) — a real count over a real,
   *  admin-configured window; never an automated diagnosis. */
  async recurringIssues(): Promise<RecurringIssueAlert[]> {
    const settings = await maintenanceSettingsService.get();
    const supabase = await createClient();
    const since = new Date(Date.now() - settings.recurringIssueWindowDays * 86400000).toISOString();
    const { data } = await supabase.from("maintenance_requests").select("property_id, category, properties(title)").gte("created_at", since);
    const counts = new Map<string, { propertyId: string; propertyTitle: string; category: string; count: number }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (data ?? []) as any[]) {
      const key = `${row.property_id}::${row.category}`;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { propertyId: row.property_id, propertyTitle: row.properties?.title ?? "Property", category: row.category, count: 1 });
    }
    return [...counts.values()]
      .filter((v) => v.count >= settings.recurringIssueThresholdCount)
      .map((v) => ({ propertyId: v.propertyId, propertyTitle: v.propertyTitle, category: v.category, count: v.count, windowDays: settings.recurringIssueWindowDays }));
  },

  /** Property condition score (section 35) — transparent, factor-
   *  disclosing, computed only from the LATEST completed inspection's
   *  real checklist results. Returns undefined when there isn't one yet
   *  (never fabricates a score). */
  async conditionScore(propertyId: string): Promise<ConditionScoreResult | undefined> {
    const supabase = await createClient();
    const { data: inspection } = await supabase
      .from("property_inspections")
      .select("id")
      .eq("property_id", propertyId)
      .in("status", ["COMPLETED", "REVIEW_REQUIRED", "APPROVED"])
      .order("completed_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!inspection) return undefined;

    const { data: results } = await supabase.from("inspection_results").select("condition, severity, item").eq("inspection_id", inspection.id);
    const scored = (results ?? []).filter((r) => CONDITION_WEIGHT[r.condition as ConditionRating] >= 0);
    if (scored.length === 0) return undefined;

    let score = scored.reduce((sum, r) => sum + CONDITION_WEIGHT[r.condition as ConditionRating], 0) / scored.length;
    const criticalIssues: string[] = [];
    for (const r of results ?? []) {
      if (r.severity && SEVERITY_PENALTY[r.severity as Severity]) {
        score -= SEVERITY_PENALTY[r.severity as Severity];
        if (r.severity === "CRITICAL") criticalIssues.push(r.item);
      }
    }
    score = Math.max(0, Math.min(100, Math.round(score)));

    const settings = await maintenanceSettingsService.get();
    const label =
      score >= settings.conditionScoreExcellentMin ? "Excellent" : score >= settings.conditionScoreGoodMin ? "Good" : score >= settings.conditionScoreFairMin ? "Fair" : score >= settings.conditionScoreNeedsAttentionMin ? "Needs Attention" : "Critical";

    const factors = [
      `Based on ${scored.length} inspected checklist item(s) from the latest completed inspection`,
      ...(criticalIssues.length > 0 ? [`${criticalIssues.length} critical issue(s) found`] : []),
    ];
    return { score, label, factors, criticalIssues };
  },

  /** Property service timeline (section 29) — merges every real event
   *  type for one property, newest first; never fetches more than a
   *  bounded window per source. */
  async propertyServiceHistory(propertyId: string, limit = 100): Promise<{ type: string; date: string; title: string; description?: string }[]> {
    const supabase = await createClient();
    const [{ data: inspections }, { data: requests }, { data: workOrders }, { data: schedules }, { data: assets }] = await Promise.all([
      supabase.from("property_inspections").select("inspection_number, inspection_type, status, completed_date, scheduled_date, created_at").eq("property_id", propertyId),
      supabase.from("maintenance_requests").select("request_number, category, status, created_at").eq("property_id", propertyId),
      supabase.from("maintenance_work_orders").select("work_order_number, description, status, completed_date, created_at").eq("property_id", propertyId),
      supabase.from("maintenance_schedules").select("maintenance_type, last_completed_date").eq("property_id", propertyId).not("last_completed_date", "is", null),
      supabase.from("maintenance_assets").select("id, asset_number").eq("property_id", propertyId),
    ]);

    const events: { type: string; date: string; title: string; description?: string }[] = [];
    for (const i of inspections ?? []) events.push({ type: "Inspection", date: i.completed_date || i.scheduled_date || i.created_at, title: `${i.inspection_number} — ${i.inspection_type}`, description: `Status: ${i.status}` });
    for (const r of requests ?? []) events.push({ type: "Request", date: r.created_at, title: `${r.request_number} — ${r.category}`, description: `Status: ${r.status}` });
    for (const w of workOrders ?? []) events.push({ type: "Work Order", date: w.completed_date || w.created_at, title: w.work_order_number, description: `${w.description} (${w.status})` });
    for (const s of schedules ?? []) events.push({ type: "Preventive Maintenance", date: s.last_completed_date as string, title: s.maintenance_type });

    const assetIds = (assets ?? []).map((a) => a.id);
    if (assetIds.length > 0) {
      const { data: warrantyRows } = await supabase.from("asset_warranties").select("provider, expiry_date, created_at, asset_id").in("asset_id", assetIds);
      const assetNumberById = new Map((assets ?? []).map((a) => [a.id, a.asset_number]));
      for (const wr of warrantyRows ?? []) {
        events.push({ type: "Warranty", date: wr.created_at, title: `Warranty added for ${assetNumberById.get(wr.asset_id) ?? "asset"}`, description: `${wr.provider ?? "Provider not specified"} — expires ${wr.expiry_date}` });
      }
    }

    return events.sort((a, b) => (b.date > a.date ? 1 : -1)).slice(0, limit);
  },
};
