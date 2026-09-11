import "server-only";
import { dealService } from "@/services/dealService";
import { formatPKR } from "@/lib/calculator";
import { formatDateOnly } from "@/lib/date";
import type { ComposerDealContext } from "@/lib/models/communication";

/** Real values for the composer's {{deal_amount}}/{{payment_amount}}/
 *  {{outstanding_amount}}/{{due_date}} template variables (section 26) —
 *  never invented; simply omitted (empty string) when a deal has no
 *  outstanding schedule item. */
export async function buildDealContext(dealId?: string): Promise<ComposerDealContext | undefined> {
  if (!dealId) return undefined;
  const [deal, schedule] = await Promise.all([dealService.getById(dealId), dealService.getScheduleForDeal(dealId)]);
  if (!deal) return undefined;

  const nextDue = schedule.filter((s) => s.status !== "Paid").sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0];

  return {
    dealAmount: formatPKR(deal.finalAmount),
    outstandingAmount: formatPKR(deal.outstandingAmount),
    paymentAmount: nextDue ? formatPKR(nextDue.amount) : undefined,
    dueDate: nextDue?.dueDate ? formatDateOnly(nextDue.dueDate) : undefined,
  };
}
