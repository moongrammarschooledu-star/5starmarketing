import Link from "next/link";
import { accountService } from "@/services/accountService";
import { AccountManager } from "@/components/admin/accounting/AccountManager";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function ExpenseCategoriesPage() {
  await requireSection("accounting");
  const categories = await accountService.list("EXPENSE");

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Expense Categories</h1>
      <p className="mt-1 text-sm text-muted">
        The same EXPENSE-type rows shown in the{" "}
        <Link href="/admin/accounting/accounts" className="text-primary hover:underline">
          Chart of Accounts
        </Link>{" "}
        — one categorization system, not a second parallel one.
      </p>
      <div className="mt-6">
        <AccountManager accounts={categories} fixedType="EXPENSE" />
      </div>
    </div>
  );
}
