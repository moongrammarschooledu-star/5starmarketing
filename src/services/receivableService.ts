import "server-only";
import { createClient } from "@/lib/supabase/server";
import { dealService } from "./dealService";
import type { Receivable, ReceivableStatus } from "@/lib/models/accounting";

const DUE_SOON_DAYS = 7;

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/** Receivables are NOT a persisted table (see migration DESIGN NOTE) —
 *  every figure here is computed live from `deals` (outstanding_amount
 *  is itself a trigger-derived generated value) joined with the
 *  existing STEP 12 payment schedule for a due date, per section 21's
 *  explicit "never calculate outstanding based on frontend-only
 *  values." */
export const receivableService = {
  async list(filters?: { agentId?: string; status?: ReceivableStatus }): Promise<Receivable[]> {
    const supabase = await createClient();
    let query = supabase
      .from("deals")
      .select("id, deal_number, customer_id, property_id, final_amount, received_amount, outstanding_amount, agent_id, status, customer_profiles(full_name), properties(title), admin_profiles(name)")
      .gt("outstanding_amount", 0)
      .neq("status", "Cancelled");
    if (filters?.agentId) query = query.eq("agent_id", filters.agentId);
    const { data, error } = await query;
    if (error) {
      console.error("receivableService.list failed:", error);
      return [];
    }

    const today = new Date();
    const receivables = await Promise.all(
      (data ?? []).map(async (row): Promise<Receivable> => {
        let dueDate: string | undefined;
        try {
          const schedule = await dealService.getScheduleForDeal(row.id);
          const nextDue = schedule.filter((s) => s.status !== "Paid" && s.dueDate).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0];
          dueDate = nextDue?.dueDate;
        } catch {
          dueDate = undefined;
        }

        const daysOverdue = dueDate ? Math.max(0, daysBetween(today, new Date(dueDate))) : 0;
        const received = Number(row.received_amount);
        const outstanding = Number(row.outstanding_amount);
        const total = Number(row.final_amount);

        let status: ReceivableStatus;
        if (outstanding <= 0) status = "PAID";
        else if (dueDate && new Date(dueDate) < today) status = "OVERDUE";
        else if (dueDate && daysBetween(new Date(dueDate), today) <= DUE_SOON_DAYS) status = "DUE_SOON";
        else if (received > 0) status = "PARTIALLY_PAID";
        else status = "CURRENT";

        return {
          dealId: row.id,
          dealNumber: row.deal_number,
          customerId: row.customer_id ?? undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          customerName: (row as any).customer_profiles?.full_name ?? undefined,
          propertyId: row.property_id ?? undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          propertyTitle: (row as any).properties?.title ?? undefined,
          totalAmount: total,
          receivedAmount: received,
          outstandingAmount: outstanding,
          dueDate,
          daysOverdue,
          status,
          assignedAgentId: row.agent_id ?? undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          assignedAgentName: (row as any).admin_profiles?.name ?? undefined,
        };
      })
    );

    if (filters?.status) return receivables.filter((r) => r.status === filters.status);
    return receivables;
  },

  async overdueTotal(): Promise<{ count: number; amount: number }> {
    const receivables = await this.list();
    const overdue = receivables.filter((r) => r.status === "OVERDUE");
    return { count: overdue.length, amount: overdue.reduce((t, r) => t + r.outstandingAmount, 0) };
  },
};
