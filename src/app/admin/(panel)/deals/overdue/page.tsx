import Link from "next/link";
import { AlertTriangle, MessageCircle, CalendarClock } from "lucide-react";
import { dealService } from "@/services/dealService";
import { automationService } from "@/services/automationService";
import { formatPKR } from "@/lib/calculator";
import { formatDateOnly } from "@/lib/date";
import { whatsappUrlFor } from "@/lib/site";
import { requireSection } from "@/lib/guard";
import { SendReminderButton } from "@/components/admin/deals/SendReminderButton";

export const dynamic = "force-dynamic";

export default async function OverduePaymentsPage() {
  await requireSection("deals");

  let rows: Awaited<ReturnType<typeof dealService.listOverduePayments>> = [];
  let loadError: string | null = null;
  try {
    rows = await dealService.listOverduePayments();
    // Marketing Automation (STEP 21) — no background job runner exists
    // in this deployment (same pattern as followUpService.markOverdue),
    // so PAYMENT_OVERDUE fires opportunistically the next time this page
    // is viewed; automation_logs' dedup key means it only actually runs
    // once per deal, never repeatedly on every page load.
    await Promise.all(
      rows
        .filter((r) => r.deal.leadId)
        .map((r) => automationService.executeTrigger("PAYMENT_OVERDUE", { leadId: r.deal.leadId!, dealId: r.deal.id, dealNumber: r.deal.dealNumber }).catch(() => {}))
    );
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load overdue payments.";
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Overdue Payments</h1>
      <p className="mt-1 text-sm text-muted">Every installment past its due date across every active deal, from real payment records.</p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      {!loadError && rows.length === 0 && <p className="mt-6 text-sm text-muted">No overdue payments right now.</p>}

      {rows.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Deal</th>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">Installment</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Outstanding</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">{r.deal.customerName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/deals/${r.deal.id}`} className="text-primary hover:underline">
                      {r.deal.dealNumber}
                    </Link>
                  </td>
                  <td className="max-w-[160px] px-4 py-3 text-muted">
                    <span className="line-clamp-1">{r.deal.propertyTitle ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">#{r.installmentNumber}</td>
                  <td className="px-4 py-3 font-bold text-primary">{r.dueDate ? formatDateOnly(r.dueDate) : "—"}</td>
                  <td className="px-4 py-3 text-ink">{formatPKR(r.amount)}</td>
                  <td className="px-4 py-3 text-success">{formatPKR(r.paidAmount)}</td>
                  <td className="px-4 py-3 font-bold text-primary">{formatPKR(r.outstanding)}</td>
                  <td className="px-4 py-3 text-xs text-muted">{r.deal.agentName ?? "Unassigned"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {r.deal.customerWhatsapp || r.deal.customerPhone ? (
                        <a
                          href={whatsappUrlFor(
                            r.deal.customerWhatsapp || r.deal.customerPhone || "",
                            `Assalam-o-Alaikum ${r.deal.customerName ?? ""}, this is 5STAR.M Estate & Builders — following up on installment #${r.installmentNumber} for ${r.deal.dealNumber}, ${formatPKR(r.outstanding)} outstanding.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Contact Customer"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-success hover:border-success"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      ) : null}
                      {r.deal.leadId && (
                        <Link href={`/admin/crm/leads/${r.deal.leadId}`} title="Add Follow-up" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary">
                          <CalendarClock className="h-4 w-4" />
                        </Link>
                      )}
                      {r.deal.customerId && (
                        <SendReminderButton
                          dealId={r.deal.id}
                          message={`Installment #${r.installmentNumber} for ${r.deal.dealNumber} was due ${r.dueDate ? formatDateOnly(r.dueDate) : "recently"} — ${formatPKR(r.outstanding)} is still outstanding.`}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
