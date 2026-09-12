import Link from "next/link";
import { financialTransactionService } from "@/services/financialTransactionService";
import { requireSection } from "@/lib/guard";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

function todayRange(): { from: string; to: string } {
  const today = new Date().toISOString().slice(0, 10);
  return { from: today, to: today };
}
function weekRange(): { from: string; to: string } {
  const d = new Date();
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return { from: start.toISOString().slice(0, 10), to: d.toISOString().slice(0, 10) };
}
function monthRange(): { from: string; to: string } {
  const d = new Date();
  return { from: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10), to: d.toISOString().slice(0, 10) };
}
function yearRange(): { from: string; to: string } {
  const d = new Date();
  return { from: new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10), to: d.toISOString().slice(0, 10) };
}

export default async function CashFlowPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireSection("accounting");
  const sp = await searchParams;
  const defaultRange = monthRange();
  const from = sp.from || defaultRange.from;
  const to = sp.to || defaultRange.to;

  const summary = await financialTransactionService.cashFlow(from, to);
  const today = todayRange();
  const week = weekRange();
  const month = monthRange();
  const year = yearRange();

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Cash Flow</h1>
      <p className="mt-1 text-sm text-muted">Real confirmed transactions only — opening balance, inflow, outflow, closing balance.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/admin/accounting/cash-flow?from=${today.from}&to=${today.to}`} className="rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary">
          Today
        </Link>
        <Link href={`/admin/accounting/cash-flow?from=${week.from}&to=${week.to}`} className="rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary">
          This Week
        </Link>
        <Link href={`/admin/accounting/cash-flow?from=${month.from}&to=${month.to}`} className="rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary">
          This Month
        </Link>
        <Link href={`/admin/accounting/cash-flow?from=${year.from}&to=${year.to}`} className="rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary">
          This Year
        </Link>
      </div>

      <form className="mt-4 flex flex-wrap items-center gap-2" action="/admin/accounting/cash-flow">
        <input type="date" name="from" defaultValue={from} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
        <span className="text-sm text-muted">to</span>
        <input type="date" name="to" defaultValue={to} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
        <button type="submit" className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
          Apply
        </button>
      </form>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card label="Opening Balance" value={summary.openingBalance} />
        <Card label="Cash Inflow" value={summary.cashInflow} tone="success" />
        <Card label="Cash Outflow" value={summary.cashOutflow} tone="primary" />
        <Card label="Net Cash Flow" value={summary.netCashFlow} tone={summary.netCashFlow >= 0 ? "success" : "primary"} />
        <Card label="Closing Balance" value={summary.closingBalance} bold />
      </div>
    </div>
  );
}

function Card({ label, value, tone, bold }: { label: string; value: number; tone?: "success" | "primary"; bold?: boolean }) {
  const toneClass = tone === "success" ? "text-success" : tone === "primary" ? "text-primary" : "text-ink";
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-2xl ${bold ? "font-extrabold" : "font-bold"} ${toneClass}`}>{formatPKR(value)}</p>
    </div>
  );
}
