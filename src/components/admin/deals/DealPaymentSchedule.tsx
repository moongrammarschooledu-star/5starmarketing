import { CalendarClock } from "lucide-react";
import type { DealScheduleInstallment } from "@/lib/models/deal";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";
import { formatDateOnly } from "@/lib/date";

export function DealPaymentSchedule({ installments }: { installments: DealScheduleInstallment[] }) {
  if (installments.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <CalendarClock className="h-4.5 w-4.5 text-primary" /> Payment Schedule
      </h2>
      <p className="mt-1 text-xs text-muted">From this property&apos;s installment plan — paid amounts reflect verified payments tagged to each installment.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Due Date</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Paid</th>
              <th className="px-3 py-2">Remaining</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2.5 font-semibold text-ink">{item.installmentNumber}</td>
                <td className="px-3 py-2.5 text-muted">{item.dueDate ? formatDateOnly(item.dueDate) : "—"}</td>
                <td className="px-3 py-2.5 text-ink">{formatPKR(item.amount)}</td>
                <td className="px-3 py-2.5 text-success">{formatPKR(item.paidAmount)}</td>
                <td className="px-3 py-2.5 text-muted">{formatPKR(item.remaining)}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
