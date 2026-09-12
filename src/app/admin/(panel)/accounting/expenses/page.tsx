import Link from "next/link";
import { AlertTriangle, Plus } from "lucide-react";
import { expenseService } from "@/services/expenseService";
import { parseExpenseSearchParams, type RawSearchParams } from "@/lib/accountingSearchParams";
import { ExpenseFilters } from "@/components/admin/accounting/ExpenseFilters";
import { ExpenseList } from "@/components/admin/accounting/ExpenseList";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireSection("accounting");
  const sp = await searchParams;
  const filters = parseExpenseSearchParams(sp);

  let result: Awaited<ReturnType<typeof expenseService.search>> = { expenses: [], total: 0, page: 1, pageSize: 25, totalPages: 1 };
  let loadError: string | null = null;
  try {
    result = await expenseService.search(filters);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load expenses.";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Expenses</h1>
          <p className="mt-1 text-sm text-muted">Every recorded business expense, DRAFT through PAID.</p>
        </div>
        <Link href="/admin/accounting/expenses/new" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <Plus className="h-4 w-4" /> New Expense
        </Link>
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6">
        <ExpenseFilters filters={filters} />
      </div>
      <div className="mt-4">
        <ExpenseList expenses={result.expenses} total={result.total} page={result.page} totalPages={result.totalPages} />
      </div>
    </div>
  );
}
