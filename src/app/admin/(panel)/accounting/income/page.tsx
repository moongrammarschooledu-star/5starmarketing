import { AlertTriangle } from "lucide-react";
import { financialTransactionService } from "@/services/financialTransactionService";
import { profileService } from "@/services/profileService";
import { parseTransactionSearchParams, type RawSearchParams } from "@/lib/accountingSearchParams";
import { TransactionFilters } from "@/components/admin/accounting/TransactionFilters";
import { TransactionList } from "@/components/admin/accounting/TransactionList";
import { canManageFinance } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function IncomePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireSection("accounting");
  const sp = await searchParams;
  const filters = parseTransactionSearchParams(sp);
  filters.transactionType = "INCOME";

  let result: Awaited<ReturnType<typeof financialTransactionService.search>> = { transactions: [], total: 0, page: 1, pageSize: 25, totalPages: 1 };
  let loadError: string | null = null;
  const admin = await profileService.getCurrentAdmin();
  try {
    result = await financialTransactionService.search(filters);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load income.";
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Income</h1>
      <p className="mt-1 text-sm text-muted">Real, confirmed cash received — never the same thing as a deal&apos;s booked value.</p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6">
        <TransactionFilters filters={filters} />
      </div>
      <div className="mt-4">
        <TransactionList transactions={result.transactions} total={result.total} page={result.page} totalPages={result.totalPages} canManage={admin ? canManageFinance(admin.role) : false} />
      </div>
    </div>
  );
}
