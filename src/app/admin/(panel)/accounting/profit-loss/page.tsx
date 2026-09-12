import Link from "next/link";
import { financialTransactionService } from "@/services/financialTransactionService";
import { requireSection } from "@/lib/guard";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

function monthRange(): { from: string; to: string } {
  const d = new Date();
  return { from: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10), to: d.toISOString().slice(0, 10) };
}
function yearRange(): { from: string; to: string } {
  const d = new Date();
  return { from: new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10), to: d.toISOString().slice(0, 10) };
}
function quarterRange(): { from: string; to: string } {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3);
  return { from: new Date(d.getFullYear(), q * 3, 1).toISOString().slice(0, 10), to: d.toISOString().slice(0, 10) };
}

export default async function ProfitLossPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireSection("accounting");
  const sp = await searchParams;
  const defaultRange = monthRange();
  const from = sp.from || defaultRange.from;
  const to = sp.to || defaultRange.to;

  const summary = await financialTransactionService.profitLoss(from, to);
  const month = monthRange();
  const quarter = quarterRange();
  const year = yearRange();

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Profit &amp; Loss</h1>
      <p className="mt-1 text-sm text-muted">Revenue minus operating expenses minus commissions, for a chosen period.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/admin/accounting/profit-loss?from=${month.from}&to=${month.to}`} className="rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary">
          This Month
        </Link>
        <Link href={`/admin/accounting/profit-loss?from=${quarter.from}&to=${quarter.to}`} className="rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary">
          This Quarter
        </Link>
        <Link href={`/admin/accounting/profit-loss?from=${year.from}&to=${year.to}`} className="rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary">
          This Year
        </Link>
      </div>

      <form className="mt-4 flex flex-wrap items-center gap-2" action="/admin/accounting/profit-loss">
        <input type="date" name="from" defaultValue={from} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
        <span className="text-sm text-muted">to</span>
        <input type="date" name="to" defaultValue={to} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
        <button type="submit" className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
          Apply
        </button>
      </form>

      <div className="mt-6 max-w-lg overflow-hidden rounded-2xl border border-border bg-surface">
        <Row label="Revenue" value={summary.revenue} />
        <Row label="Direct Costs" value={-summary.directCosts} />
        <Row label="Gross Profit" value={summary.grossProfit} bold />
        <Row label="Operating Expenses" value={-summary.operatingExpenses} />
        <Row label="Commissions" value={-summary.commissions} />
        <Row label="Net Profit" value={summary.netProfit} bold accent />
      </div>
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: number; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b border-border px-5 py-3.5 last:border-0 ${bold ? "bg-surface-muted/50" : ""}`}>
      <span className={`text-sm ${bold ? "font-bold text-ink" : "text-muted"}`}>{label}</span>
      <span className={`font-heading text-sm ${bold ? "font-extrabold" : "font-semibold"} ${accent ? "text-primary" : "text-ink"}`}>{formatPKR(value)}</span>
    </div>
  );
}
