import { accountService } from "@/services/accountService";
import { AccountManager } from "@/components/admin/accounting/AccountManager";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  await requireSection("accounting");
  const accounts = await accountService.list();

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Chart of Accounts</h1>
      <p className="mt-1 text-sm text-muted">Assets, Liabilities, Equity, Income and Expenses — the same structure used for expense categories.</p>
      <div className="mt-6">
        <AccountManager accounts={accounts} />
      </div>
    </div>
  );
}
