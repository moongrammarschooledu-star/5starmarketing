import Link from "next/link";
import { TrendingUp, Wallet, Users, Download } from "lucide-react";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

const EXPORTS = [
  { type: "income", label: "Income" },
  { type: "expenses", label: "Expenses" },
  { type: "receivables", label: "Receivables" },
  { type: "payables", label: "Payables" },
  { type: "commissions", label: "Commissions" },
];

export default async function AccountingReportsPage() {
  await requireSection("accounting");

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Financial Reports</h1>
      <p className="mt-1 text-sm text-muted">Profit &amp; Loss, Cash Flow, Commission reports, and CSV exports. Deal/property/project profitability lives on each entity&apos;s own Financial tab.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/admin/accounting/profit-loss" className="rounded-2xl border border-border bg-surface p-5 hover:border-primary">
          <TrendingUp className="h-6 w-6 text-primary" />
          <p className="mt-3 font-heading text-lg font-bold text-ink">Profit &amp; Loss</p>
          <p className="mt-1 text-sm text-muted">Revenue, expenses, commissions, net profit for any period.</p>
        </Link>
        <Link href="/admin/accounting/cash-flow" className="rounded-2xl border border-border bg-surface p-5 hover:border-primary">
          <Wallet className="h-6 w-6 text-primary" />
          <p className="mt-3 font-heading text-lg font-bold text-ink">Cash Flow</p>
          <p className="mt-1 text-sm text-muted">Opening/closing balance, inflow and outflow.</p>
        </Link>
        <Link href="/admin/accounting/commissions" className="rounded-2xl border border-border bg-surface p-5 hover:border-primary">
          <Users className="h-6 w-6 text-primary" />
          <p className="mt-3 font-heading text-lg font-bold text-ink">Commission Report</p>
          <p className="mt-1 text-sm text-muted">Every agent&apos;s commission basis, rate, amount, and payment status.</p>
        </Link>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Export to CSV</h2>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {EXPORTS.map((e) => (
            <a key={e.type} href={`/admin/accounting/export?type=${e.type}`} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
              <Download className="h-4 w-4" /> {e.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
