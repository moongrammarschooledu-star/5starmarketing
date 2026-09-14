import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

export default async function RentalExpensesPage() {
  const supabase = await createClient();
  const { data: rentalProps } = await supabase.from("rental_properties").select("property_id");
  const propertyIds = Array.from(new Set((rentalProps ?? []).map((r) => r.property_id)));

  const { data } =
    propertyIds.length > 0
      ? await supabase.from("expenses").select("id, expense_number, description, amount, status, expense_date, properties(title), accounts(name)").in("property_id", propertyIds).order("expense_date", { ascending: false })
      : { data: [] };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/rentals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to Rentals
          </Link>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Rental Expenses</h1>
          <p className="mt-1 text-sm text-muted">Reuses the existing Accounting expense workflow — never a parallel ledger.</p>
        </div>
        <Link href="/admin/accounting/expenses/new" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
          <Plus className="h-4 w-4" /> New Expense
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Expense #</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {((data ?? []) as any[]).map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/accounting/expenses/${e.id}`} className="font-semibold text-primary hover:underline">
                    {e.expense_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{e.properties?.title ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{e.accounts?.name ?? "—"}</td>
                <td className="px-4 py-3 text-ink">{e.description}</td>
                <td className="px-4 py-3 font-semibold text-ink">{formatPKR(Number(e.amount))}</td>
                <td className="px-4 py-3 text-muted">{new Date(e.expense_date).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={e.status} />
                </td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  No rental expenses recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
