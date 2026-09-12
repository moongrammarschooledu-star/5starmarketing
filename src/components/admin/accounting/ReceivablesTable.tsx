"use client";

import { useTransition } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { Receivable } from "@/lib/models/accounting";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { sendReceivableReminderAction } from "@/lib/actions/accounting.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { formatPKR } from "@/lib/calculator";

export function ReceivablesTable({ receivables }: { receivables: Receivable[] }) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function remind(dealId: string) {
    startTransition(async () => {
      try {
        await sendReceivableReminderAction(dealId);
        toast.show("Reminder sent.");
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not send this reminder.");
      }
    });
  }

  if (receivables.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">No outstanding receivables.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Deal</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Property</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Received</th>
            <th className="px-4 py-3">Outstanding</th>
            <th className="px-4 py-3">Due Date</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Agent</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {receivables.map((r) => (
            <tr key={r.dealId} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <Link href={`/admin/deals/${r.dealId}`} className="font-semibold text-ink hover:text-primary hover:underline">
                  {r.dealNumber}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted">{r.customerName || "—"}</td>
              <td className="px-4 py-3 text-muted">{r.propertyTitle || "—"}</td>
              <td className="px-4 py-3 text-muted">{formatPKR(r.totalAmount)}</td>
              <td className="px-4 py-3 text-muted">{formatPKR(r.receivedAmount)}</td>
              <td className="px-4 py-3 font-semibold text-ink">{formatPKR(r.outstandingAmount)}</td>
              <td className="px-4 py-3 text-muted">
                {r.dueDate || "—"}
                {r.status === "OVERDUE" && <span className="ml-1 text-xs text-primary">({r.daysOverdue}d overdue)</span>}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-4 py-3 text-muted">{r.assignedAgentName || "Unassigned"}</td>
              <td className="px-4 py-3">
                <button type="button" onClick={() => remind(r.dealId)} disabled={isPending} className="flex items-center gap-1 rounded-full border-2 border-ink/15 px-3 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
                  <MessageCircle className="h-3.5 w-3.5" /> Remind
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
