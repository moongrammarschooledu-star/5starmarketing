import "server-only";
import { createClient } from "@/lib/supabase/server";
import { leaseService } from "./leaseService";
import type { RentSchedule, RentScheduleAdjustmentInput, RentScheduleStatus } from "@/lib/models/rental";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): RentSchedule {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    leaseId: row.lease_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    dueDate: row.due_date,
    rentAmount: Number(row.rent_amount),
    additionalCharges: Number(row.additional_charges),
    discountAmount: Number(row.discount_amount),
    lateFeeAmount: Number(row.late_fee_amount),
    taxAmount: Number(row.tax_amount),
    totalDue: Number(row.total_due),
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Never a stored figure (see migration DESIGN NOTES) — always summed
 *  live from real, CONFIRMED rent_payments rows. */
async function attachLiveAmounts(schedules: RentSchedule[]): Promise<RentSchedule[]> {
  if (schedules.length === 0) return schedules;
  const supabase = await createClient();
  const { data } = await supabase.from("rent_payments").select("rent_schedule_id, amount").eq("status", "CONFIRMED").in("rent_schedule_id", schedules.map((s) => s.id));
  const paidByLease = new Map<string, number>();
  for (const p of data ?? []) {
    paidByLease.set(p.rent_schedule_id, (paidByLease.get(p.rent_schedule_id) ?? 0) + Number(p.amount));
  }
  return schedules.map((s) => {
    const amountPaid = round2(paidByLease.get(s.id) ?? 0);
    return { ...s, amountPaid, outstanding: round2(Math.max(0, s.totalDue - amountPaid)) };
  });
}

/** Recomputes UPCOMING/DUE/PARTIALLY_PAID/PAID/OVERDUE from real
 *  payments — never touches an explicit WAIVED/CANCELLED override. */
async function recomputeStatus(schedule: RentSchedule): Promise<RentScheduleStatus> {
  if (schedule.status === "WAIVED" || schedule.status === "CANCELLED") return schedule.status;
  const [withAmounts] = await attachLiveAmounts([schedule]);
  const amountPaid = withAmounts.amountPaid ?? 0;
  if (schedule.totalDue > 0 && amountPaid >= schedule.totalDue) return "PAID";
  const today = new Date().toISOString().slice(0, 10);
  if (amountPaid > 0) return "PARTIALLY_PAID";
  if (schedule.dueDate < today) return "OVERDUE";
  if (schedule.dueDate === today) return "DUE";
  return "UPCOMING";
}

export const rentScheduleService = {
  async listForLease(leaseId: string): Promise<RentSchedule[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("rent_schedules").select("*").eq("lease_id", leaseId).order("period_start", { ascending: true });
    if (error) return [];
    return attachLiveAmounts((data ?? []).map(mapRow));
  },

  async getById(id: string): Promise<RentSchedule | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("rent_schedules").select("*").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    const [schedule] = await attachLiveAmounts([mapRow(data)]);
    return schedule;
  },

  async listDueBetween(dateFrom: string, dateTo: string): Promise<RentSchedule[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("rent_schedules").select("*").gte("due_date", dateFrom).lte("due_date", dateTo).not("status", "in", "(WAIVED,CANCELLED)").order("due_date", { ascending: true });
    if (error) return [];
    return attachLiveAmounts((data ?? []).map(mapRow));
  },

  async listOverdue(): Promise<RentSchedule[]> {
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.from("rent_schedules").select("*").lt("due_date", today).not("status", "in", "(PAID,WAIVED,CANCELLED)").order("due_date", { ascending: true });
    if (error) return [];
    return attachLiveAmounts((data ?? []).map(mapRow));
  },

  /** Section 10/52 — idempotent: never re-creates a period whose
   *  (lease_id, period_start, period_end) already exists (also enforced
   *  by the DB's own unique constraint as a second line of defense). */
  async generate(leaseId: string, numberOfPeriods = 12): Promise<RentSchedule[]> {
    const lease = await leaseService.getById(leaseId);
    if (!lease) throw new Error("Lease not found.");

    const supabase = await createClient();
    const { data: existingRows } = await supabase.from("rent_schedules").select("period_start").eq("lease_id", leaseId).order("period_start", { ascending: true });
    const existingPeriods = new Set((existingRows ?? []).map((r) => r.period_start));
    const lastPeriodStart = existingRows && existingRows.length > 0 ? existingRows[existingRows.length - 1].period_start : undefined;

    const leaseEnd = new Date(lease.endDate);
    let cursor = lastPeriodStart ? addMonths(new Date(lastPeriodStart), 1) : new Date(lease.startDate);

    const created: RentSchedule[] = [];
    for (let i = 0; i < numberOfPeriods; i++) {
      if (cursor > leaseEnd) break;
      const periodStart = new Date(cursor);
      const periodEnd = new Date(addMonths(periodStart, 1).getTime() - 86400000);
      const clampedEnd = periodEnd > leaseEnd ? leaseEnd : periodEnd;
      if (existingPeriods.has(toIso(periodStart))) {
        cursor = addMonths(cursor, 1);
        continue;
      }
      const dueDate = new Date(periodStart);
      dueDate.setDate(Math.min(lease.paymentDueDay, 28));

      const { data, error } = await supabase
        .from("rent_schedules")
        .insert({
          lease_id: leaseId,
          period_start: toIso(periodStart),
          period_end: toIso(clampedEnd),
          due_date: toIso(dueDate),
          rent_amount: lease.monthlyRent,
        })
        .select("*")
        .single();
      if (!error && data) created.push(mapRow(data));
      cursor = addMonths(cursor, 1);
    }
    return attachLiveAmounts(created);
  },

  async adjust(id: string, input: RentScheduleAdjustmentInput): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.additionalCharges !== undefined) row.additional_charges = round2(input.additionalCharges);
    if (input.discountAmount !== undefined) row.discount_amount = round2(input.discountAmount);
    if (input.taxAmount !== undefined) row.tax_amount = round2(input.taxAmount);
    if (input.notes !== undefined) row.notes = input.notes || null;
    const { error } = await supabase.from("rent_schedules").update(row).eq("id", id);
    if (error) throw new Error("Could not adjust this rent period.");
  },

  /** Section 18 — never a hardcoded fee; always the lease's own
   *  configured rule. NONE never applies a fee, no matter how overdue. */
  async applyLateFee(id: string): Promise<void> {
    const schedule = await this.getById(id);
    if (!schedule) throw new Error("Rent period not found.");
    const lease = await leaseService.getById(schedule.leaseId);
    if (!lease) throw new Error("Lease not found.");
    if (lease.lateFeeType === "NONE") return;

    const dueDate = new Date(schedule.dueDate);
    const graceEnd = new Date(dueDate);
    graceEnd.setDate(graceEnd.getDate() + lease.gracePeriodDays);
    const today = new Date();
    if (today <= graceEnd) return;
    const daysLate = Math.floor((today.getTime() - graceEnd.getTime()) / 86400000);

    let lateFee = 0;
    if (lease.lateFeeType === "FIXED") lateFee = lease.lateFeeValue;
    else if (lease.lateFeeType === "PERCENTAGE") lateFee = (schedule.rentAmount * lease.lateFeeValue) / 100;
    else if (lease.lateFeeType === "DAILY") lateFee = lease.lateFeeValue * daysLate;

    const supabase = await createClient();
    const { error } = await supabase.from("rent_schedules").update({ late_fee_amount: round2(lateFee) }).eq("id", id);
    if (error) throw new Error("Could not apply the late fee.");
  },

  async waive(id: string, notes?: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("rent_schedules").update({ status: "WAIVED", notes: notes || null }).eq("id", id);
    if (error) throw new Error("Could not waive this rent period.");
  },

  async cancel(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("rent_schedules").update({ status: "CANCELLED" }).eq("id", id);
    if (error) throw new Error("Could not cancel this rent period.");
  },

  /** Called after a payment is confirmed/reversed to keep the stored
   *  status (used for filtering/dashboards) in sync with the live
   *  amounts — the amounts themselves are never stored, only the
   *  status label is, purely so admins can filter/sort by it. */
  async refreshStatus(id: string): Promise<void> {
    const schedule = await this.getById(id);
    if (!schedule) return;
    const nextStatus = await recomputeStatus(schedule);
    if (nextStatus !== schedule.status) {
      const supabase = await createClient();
      await supabase.from("rent_schedules").update({ status: nextStatus }).eq("id", id);
    }
  },
};
