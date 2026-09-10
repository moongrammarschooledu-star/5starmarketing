import Link from "next/link";
import { AlertTriangle, Handshake, Activity, Clock, CheckCircle2, Loader2, XCircle, Wallet, TrendingUp, PiggyBank, BadgeDollarSign, Kanban, BarChart3 } from "lucide-react";
import { dealService } from "@/services/dealService";
import { teamService } from "@/services/teamService";
import { StatCard } from "@/components/admin/StatCard";
import { DealFilters } from "@/components/admin/deals/DealFilters";
import { DealsTable } from "@/components/admin/deals/DealsTable";
import { parseDealSearchParams, type RawSearchParams } from "@/lib/dealSearchParams";
import { formatPKR } from "@/lib/calculator";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function DealsDashboardPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireSection("deals");
  const sp = await searchParams;
  const filters = parseDealSearchParams(sp);

  let stats: Awaited<ReturnType<typeof dealService.dashboardStats>> = {
    totalDeals: 0,
    active: 0,
    bookingPending: 0,
    bookingConfirmed: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    totalDealValue: 0,
    totalReceived: 0,
    outstandingAmount: 0,
    expectedCommission: 0,
    paidCommission: 0,
  };
  let result: Awaited<ReturnType<typeof dealService.search>> = { deals: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
  let agents: { id: string; name: string }[] = [];
  let loadError: string | null = null;

  try {
    const [s, r, a] = await Promise.all([dealService.dashboardStats(), dealService.search(filters), teamService.listAssignable()]);
    stats = s;
    result = r;
    agents = a;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load deals.";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Deals</h1>
          <p className="mt-1 text-sm text-muted">Every transaction from booking to completion — real payments, real commission, real numbers.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/deals/overdue" className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
            <AlertTriangle className="h-3.5 w-3.5" /> Overdue Payments
          </Link>
          <Link href="/admin/deals/pipeline" className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
            <Kanban className="h-3.5 w-3.5" /> Pipeline
          </Link>
          <Link href="/admin/deals/reports" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover">
            <BarChart3 className="h-3.5 w-3.5" /> Reports
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      {!loadError && stats.totalDeals === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <Handshake className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-heading text-base font-bold text-ink">No deals yet</p>
          <p className="mt-1 text-sm text-muted">Create your first deal from a qualified lead in the CRM, or start one directly here.</p>
          <Link href="/admin/deals/new" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
            New Deal
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
            <StatCard label="Total Deals" value={stats.totalDeals} icon={Handshake} />
            <StatCard label="Active" value={stats.active} icon={Activity} tone="primary" />
            <StatCard label="Booking Pending" value={stats.bookingPending} icon={Clock} />
            <StatCard label="Booked" value={stats.bookingConfirmed} icon={CheckCircle2} tone="success" />
            <StatCard label="In Progress" value={stats.inProgress} icon={Loader2} />
            <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} tone="success" />
            <StatCard label="Cancelled" value={stats.cancelled} icon={XCircle} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard label="Total Deal Value" value={formatPKR(stats.totalDealValue)} icon={Wallet} tone="primary" />
            <StatCard label="Total Received" value={formatPKR(stats.totalReceived)} icon={TrendingUp} tone="success" />
            <StatCard label="Outstanding" value={formatPKR(stats.outstandingAmount)} icon={PiggyBank} />
            <StatCard label="Expected Commission" value={formatPKR(stats.expectedCommission)} icon={BadgeDollarSign} tone="primary" />
            <StatCard label="Paid Commission" value={formatPKR(stats.paidCommission)} icon={BadgeDollarSign} tone="success" />
          </div>

          <div className="mt-8">
            <DealFilters filters={filters} agents={agents} />
          </div>
          <div className="mt-4">
            <DealsTable deals={result.deals} total={result.total} page={result.page} totalPages={result.totalPages} pageSize={result.pageSize} />
          </div>
        </>
      )}
    </div>
  );
}
