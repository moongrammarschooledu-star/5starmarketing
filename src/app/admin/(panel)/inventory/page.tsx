import Link from "next/link";
import { AlertTriangle, Boxes, CheckCircle2, Clock, Bookmark, DollarSign, Home, Building2, HardHat, Sparkles, Ban, Wallet, FolderKanban, BarChart3 } from "lucide-react";
import { inventoryService } from "@/services/inventoryService";
import { projectService } from "@/services/projectService";
import { profileService } from "@/services/profileService";
import { StatCard } from "@/components/admin/StatCard";
import { InventoryFilters } from "@/components/admin/inventory/InventoryFilters";
import { InventoryTable } from "@/components/admin/inventory/InventoryTable";
import { parseInventorySearchParams, type RawSearchParams } from "@/lib/inventorySearchParams";
import { formatPKR } from "@/lib/calculator";
import { canManageDealFinancials } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function InventoryDashboardPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireSection("inventory");
  const sp = await searchParams;
  const filters = parseInventorySearchParams(sp);

  let stats: Awaited<ReturnType<typeof inventoryService.dashboardStats>> = {
    total: 0,
    available: 0,
    reserved: 0,
    booked: 0,
    sold: 0,
    rented: 0,
    underConstruction: 0,
    comingSoon: 0,
    blocked: 0,
    totalValue: 0,
    availableValue: 0,
    soldValue: 0,
  };
  let result: Awaited<ReturnType<typeof inventoryService.search>> = { units: [], total: 0, page: 1, pageSize: 24, totalPages: 1 };
  let projects: { id: string; name: string }[] = [];
  let canBulkUpdate = false;
  let loadError: string | null = null;

  try {
    const [s, r, p, admin] = await Promise.all([inventoryService.dashboardStats(), inventoryService.search(filters), projectService.list(), profileService.getCurrentAdmin()]);
    stats = s;
    result = r;
    projects = p.map((proj) => ({ id: proj.id, name: proj.name }));
    canBulkUpdate = admin ? canManageDealFinancials(admin.role) : false;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load inventory.";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Inventory</h1>
          <p className="mt-1 text-sm text-muted">Every unit, plot and block across every project — real availability, real prices.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/inventory/projects" className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
            <FolderKanban className="h-3.5 w-3.5" /> Project Inventory
          </Link>
          <Link href="/admin/inventory/reports" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover">
            <BarChart3 className="h-3.5 w-3.5" /> Reports
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      {!loadError && stats.total === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <Boxes className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-heading text-base font-bold text-ink">No inventory available yet.</p>
          <Link href="/admin/inventory/new" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
            Add Inventory Unit
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
            <StatCard label="Total" value={stats.total} icon={Boxes} />
            <StatCard label="Available" value={stats.available} icon={CheckCircle2} tone="success" />
            <StatCard label="Reserved" value={stats.reserved} icon={Clock} />
            <StatCard label="Booked" value={stats.booked} icon={Bookmark} tone="primary" />
            <StatCard label="Sold" value={stats.sold} icon={DollarSign} tone="success" />
            <StatCard label="Rented" value={stats.rented} icon={Home} />
            <StatCard label="Under Construction" value={stats.underConstruction} icon={HardHat} />
            <StatCard label="Coming Soon" value={stats.comingSoon} icon={Sparkles} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Blocked" value={stats.blocked} icon={Ban} />
            <StatCard label="Total Inventory Value" value={formatPKR(stats.totalValue)} icon={Wallet} tone="primary" />
            <StatCard label="Available Value" value={formatPKR(stats.availableValue)} icon={Wallet} tone="success" />
            <StatCard label="Sold Value" value={formatPKR(stats.soldValue)} icon={Building2} tone="success" />
          </div>

          <div className="mt-8">
            <InventoryFilters filters={filters} projects={projects} />
          </div>
          <div className="mt-4">
            <InventoryTable units={result.units} total={result.total} page={result.page} totalPages={result.totalPages} pageSize={result.pageSize} canBulkUpdate={canBulkUpdate} />
          </div>
        </>
      )}
    </div>
  );
}
