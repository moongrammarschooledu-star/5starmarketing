import Link from "next/link";
import { FileStack } from "lucide-react";
import type { Expense } from "@/lib/models/accounting";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CrmPaginationLinks } from "@/components/admin/crm/CrmPaginationLinks";
import { formatPKR } from "@/lib/calculator";
import { formatDateOnly } from "@/lib/date";

export function ExpenseList({ expenses, total, page, totalPages }: { expenses: Expense[]; total: number; page: number; totalPages: number }) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
        <FileStack className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted">No expenses found.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/accounting/expenses/${e.id}`} className="font-semibold text-ink hover:text-primary hover:underline">
                    {e.expenseNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{formatDateOnly(e.expenseDate)}</td>
                <td className="px-4 py-3 text-muted">{e.accountName || "—"}</td>
                <td className="max-w-xs truncate px-4 py-3 text-muted">{e.description}</td>
                <td className="px-4 py-3 text-muted">{e.vendor || "—"}</td>
                <td className="px-4 py-3 font-semibold text-ink">{formatPKR(e.amount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={e.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{total} expense(s) total.</p>
      <CrmPaginationLinks page={page} totalPages={totalPages} />
    </div>
  );
}
