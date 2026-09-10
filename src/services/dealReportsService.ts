import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DateRange } from "@/lib/models/analytics";
import type {
  SalesReportSummary,
  MonthlySalesRow,
  AgentSalesRow,
  PropertySalesRow,
  ProjectSalesRow,
  DealTypeSalesRow,
  CommissionSummaryRow,
  DealType,
  CommissionStatus,
} from "@/lib/models/deal";
import { dealTypes, commissionStatuses } from "@/lib/models/deal";

const MIN_DEALS_FOR_SUMMARY = 3;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DealRow = any;

async function fetchDealsInRange(range: DateRange): Promise<DealRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select(
      "id, status, deal_type, final_amount, received_amount, outstanding_amount, commission_amount, commission_paid_amount, commission_status, agent_id, property_id, property_title:properties(title), project_id, projects(name), created_at, completed_at, admin_profiles!deals_agent_id_fkey(name)"
    )
    .gte("created_at", range.from)
    .lt("created_at", range.to);
  if (error) {
    console.error("dealReportsService: fetchDealsInRange failed:", error);
    return [];
  }
  return data ?? [];
}

export const dealReportsService = {
  /** Real, from-data sales reporting (section 42-44) — every row comes
   *  straight from `deals`, never invented. */
  async summary(range: DateRange): Promise<SalesReportSummary> {
    const rows = await fetchDealsInRange(range);
    const total = rows.length;
    const completed = rows.filter((r) => r.status === "Completed");
    const cancelled = rows.filter((r) => r.status === "Cancelled");
    const active = rows.filter((r) => r.status !== "Cancelled");

    const totalDealValue = active.reduce((sum, r) => sum + Number(r.final_amount ?? 0), 0);
    const totalReceived = active.reduce((sum, r) => sum + Number(r.received_amount ?? 0), 0);
    const totalOutstanding = active.reduce((sum, r) => sum + Number(r.outstanding_amount ?? 0), 0);

    // By month
    const monthMap = new Map<string, MonthlySalesRow>();
    for (const r of active) {
      const month = String(r.created_at).slice(0, 7);
      const entry = monthMap.get(month) ?? { month, deals: 0, dealValue: 0, received: 0, outstanding: 0, completed: 0 };
      entry.deals += 1;
      entry.dealValue += Number(r.final_amount ?? 0);
      entry.received += Number(r.received_amount ?? 0);
      entry.outstanding += Number(r.outstanding_amount ?? 0);
      if (r.status === "Completed") entry.completed += 1;
      monthMap.set(month, entry);
    }
    const byMonth = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month));

    // By agent
    const agentMap = new Map<string, AgentSalesRow>();
    for (const r of active) {
      if (!r.agent_id) continue;
      const entry = agentMap.get(r.agent_id) ?? {
        agentId: r.agent_id,
        agentName: r.admin_profiles?.name ?? "Agent",
        deals: 0,
        completed: 0,
        dealValue: 0,
        commissionEarned: 0,
        commissionPaid: 0,
      };
      entry.deals += 1;
      entry.dealValue += Number(r.final_amount ?? 0);
      entry.commissionEarned += Number(r.commission_amount ?? 0);
      entry.commissionPaid += Number(r.commission_paid_amount ?? 0);
      if (r.status === "Completed") entry.completed += 1;
      agentMap.set(r.agent_id, entry);
    }
    const byAgent = [...agentMap.values()].sort((a, b) => b.dealValue - a.dealValue);

    // By property
    const propertyMap = new Map<string, PropertySalesRow>();
    for (const r of active) {
      if (!r.property_id) continue;
      const entry = propertyMap.get(r.property_id) ?? {
        propertyId: r.property_id,
        propertyTitle: r.property_title?.title ?? "Property",
        deals: 0,
        dealValue: 0,
        received: 0,
        outstanding: 0,
        completed: 0,
      };
      entry.deals += 1;
      entry.dealValue += Number(r.final_amount ?? 0);
      entry.received += Number(r.received_amount ?? 0);
      entry.outstanding += Number(r.outstanding_amount ?? 0);
      if (r.status === "Completed") entry.completed += 1;
      propertyMap.set(r.property_id, entry);
    }
    const byProperty = [...propertyMap.values()].sort((a, b) => b.dealValue - a.dealValue);

    // By project
    const projectMap = new Map<string, ProjectSalesRow>();
    for (const r of active) {
      if (!r.project_id) continue;
      const entry = projectMap.get(r.project_id) ?? {
        projectId: r.project_id,
        projectName: r.projects?.name ?? "Project",
        bookings: 0,
        dealValue: 0,
        received: 0,
        outstanding: 0,
        completed: 0,
      };
      entry.bookings += 1;
      entry.dealValue += Number(r.final_amount ?? 0);
      entry.received += Number(r.received_amount ?? 0);
      entry.outstanding += Number(r.outstanding_amount ?? 0);
      if (r.status === "Completed") entry.completed += 1;
      projectMap.set(r.project_id, entry);
    }
    const byProject = [...projectMap.values()].sort((a, b) => b.dealValue - a.dealValue);

    // By deal type
    const byDealType: DealTypeSalesRow[] = dealTypes
      .map((dealType: DealType) => {
        const matching = active.filter((r) => r.deal_type === dealType);
        return {
          dealType,
          deals: matching.length,
          dealValue: matching.reduce((sum, r) => sum + Number(r.final_amount ?? 0), 0),
          completed: matching.filter((r) => r.status === "Completed").length,
        };
      })
      .filter((row) => row.deals > 0);

    // Commission summary
    const commissionSummary: CommissionSummaryRow[] = commissionStatuses
      .map((commissionStatus: CommissionStatus) => {
        const matching = active.filter((r) => r.commission_status === commissionStatus);
        return { commissionStatus, deals: matching.length, amount: matching.reduce((sum, r) => sum + Number(r.commission_amount ?? 0), 0) };
      })
      .filter((row) => row.deals > 0);

    return {
      hasEnoughData: total >= MIN_DEALS_FOR_SUMMARY,
      totalDeals: total,
      completedDeals: completed.length,
      cancelledDeals: cancelled.length,
      totalDealValue,
      totalReceived,
      totalOutstanding,
      byMonth,
      byAgent,
      byProperty,
      byProject,
      byDealType,
      commissionSummary,
    };
  },
};
