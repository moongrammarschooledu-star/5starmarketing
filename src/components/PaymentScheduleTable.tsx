import { CalendarClock } from "lucide-react";
import { formatPKR } from "@/lib/calculator";
import { formatDateOnly } from "@/lib/date";
import type { PaymentScheduleItem } from "@/lib/models/paymentPlan";

export function PaymentScheduleTable({ items }: { items: PaymentScheduleItem[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
        <CalendarClock className="h-4.5 w-4.5 text-primary" /> Payment Schedule
      </h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Due Date</th>
              <th className="py-2 pr-3">Amount</th>
              <th className="py-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="py-2 pr-3 font-semibold text-ink">{item.installmentNumber}</td>
                <td className="py-2 pr-3 text-muted">{item.dueDate ? formatDateOnly(item.dueDate) : "—"}</td>
                <td className="py-2 pr-3 font-semibold text-ink">{formatPKR(item.amount)}</td>
                <td className="py-2 text-muted">{item.description || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        This schedule is informational unless formally confirmed by 5STAR.M Estate &amp; Builders.
      </p>
    </div>
  );
}
