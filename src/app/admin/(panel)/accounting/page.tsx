import Link from "next/link";
import { LayoutDashboard, TrendingUp, Receipt, Landmark, FileWarning, Users, ListTree, Layers, BarChart3, ScaleIcon, Wallet2, Scale, Settings, ArrowRight } from "lucide-react";
import { accountingReportService } from "@/services/accountingReportService";
import { profileService } from "@/services/profileService";
import { canManageFinance } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

export default async function AccountingIndexPage() {
  await requireSection("accounting");
  const [stats, admin] = await Promise.all([accountingReportService.dashboardStats(), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageFinance(admin.role) : false;

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Accounting</h1>
      <p className="mt-1 text-sm text-muted">Income, expenses, receivables, payables, agent commissions, and profit &amp; loss — all from real Supabase records.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Net Profit" value={formatPKR(stats.netProfit)} accent={stats.netProfit < 0} />
        <StatCard label="Outstanding Receivables" value={formatPKR(stats.outstandingReceivables)} accent={stats.outstandingReceivables > 0} />
        <StatCard label="Pending Commissions" value={formatPKR(stats.pendingCommissionsAmount)} />
        <StatCard label="This Month Revenue" value={formatPKR(stats.thisMonthRevenue)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NavCard href="/admin/accounting/dashboard" icon={LayoutDashboard} title="Dashboard" desc="Full financial dashboard with trends and alerts." />
        <NavCard href="/admin/accounting/income" icon={TrendingUp} title="Income" desc="Confirmed revenue by source, customer, and deal." />
        <NavCard href="/admin/accounting/expenses" icon={Receipt} title="Expenses" desc="Submit, review, approve, and pay business expenses." />
        <NavCard href="/admin/accounting/receivables" icon={Wallet2} title="Receivables" desc="Outstanding balances across every active deal." />
        <NavCard href="/admin/accounting/payables" icon={Landmark} title="Payables" desc="Money owed to vendors, contractors, and agents." />
        <NavCard href="/admin/accounting/commissions" icon={Users} title="Commissions" desc="Calculate, approve, and pay agent commissions." />
        <NavCard href="/admin/accounting/transactions" icon={ListTree} title="Transactions" desc="The full confirmed-money ledger." />
        <NavCard href="/admin/accounting/accounts" icon={Layers} title="Accounts" desc="The chart of accounts." />
        <NavCard href="/admin/accounting/categories" icon={FileWarning} title="Categories" desc="Expense categories (the same accounts, filtered)." />
        <NavCard href="/admin/accounting/reports" icon={BarChart3} title="Reports" desc="P&L, cash flow, commission report, CSV exports." />
        <NavCard href="/admin/accounting/profit-loss" icon={Scale} title="Profit & Loss" desc="Revenue, expenses, commissions, net profit." />
        <NavCard href="/admin/accounting/cash-flow" icon={ScaleIcon} title="Cash Flow" desc="Opening/closing balance, inflow and outflow." />
        <NavCard href="/admin/accounting/reconciliation" icon={Scale} title="Reconciliation" desc="Match system transactions to your bank statement." />
        {canManage && <NavCard href="/admin/accounting/settings" icon={Settings} title="Settings" desc="Commission default, fiscal year, currency." />}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-xl font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function NavCard({ href, icon: Icon, title, desc }: { href: string; icon: typeof LayoutDashboard; title: string; desc: string }) {
  return (
    <Link href={href} className="group flex flex-col rounded-2xl border border-border bg-surface p-5 hover:border-primary">
      <Icon className="h-6 w-6 text-primary" />
      <p className="mt-3 font-heading text-lg font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{desc}</p>
      <span className="mt-3 flex items-center gap-1 text-xs font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
