import Link from "next/link";
import { LayoutDashboard, Building2, Users, KeyRound, FileText, Wallet, Settings, ArrowRight, Plus } from "lucide-react";
import { rentalReportService } from "@/services/rentalReportService";
import { rentalPropertyService } from "@/services/rentalPropertyService";
import { profileService } from "@/services/profileService";
import { canManageRentals } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { formatPKR } from "@/lib/calculator";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function RentalsIndexPage() {
  await requireSection("rentals");
  const [stats, rentalProperties, admin] = await Promise.all([rentalReportService.dashboardStats(), rentalPropertyService.list(), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageRentals(admin.role) : false;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Rental &amp; Property Management</h1>
          <p className="mt-1 text-sm text-muted">Landlords, tenants, leases, rent collection and statements — all from real, recorded data.</p>
        </div>
        {canManage && (
          <Link href="/admin/rentals/properties/new" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
            <Plus className="h-4 w-4" /> Add Rental Property
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Rental Properties" value={String(stats.totalRentalProperties)} />
        <StatCard label="Occupied" value={String(stats.occupiedUnits)} />
        <StatCard label="Vacant" value={String(stats.vacantUnits)} />
        <StatCard label="Active Leases" value={String(stats.activeLeases)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Rent Collected (Month)" value={formatPKR(stats.rentCollected)} />
        <StatCard label="Outstanding Rent" value={formatPKR(stats.outstandingRent)} accent={stats.outstandingRent > 0} />
        <StatCard label="Overdue Rent" value={formatPKR(stats.overdueRent)} accent={stats.overdueRent > 0} />
        <StatCard label="Net Rental Income" value={formatPKR(stats.netRentalIncome)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <NavCard href="/admin/rentals/dashboard" icon={LayoutDashboard} title="Dashboard" desc="Occupancy, collection trend, income vs expenses." />
        <NavCard href="/admin/rentals/properties" icon={Building2} title="Rental Properties" desc="Every property/unit set up for rent." />
        <NavCard href="/admin/rentals/tenants" icon={Users} title="Tenants" desc="Tenant profiles and status." />
        <NavCard href="/admin/rentals/landlords" icon={Users} title="Landlords" desc="Owners, management fees, agreements." />
        <NavCard href="/admin/rentals/leases" icon={FileText} title="Leases" desc="Full lease lifecycle, rent schedules." />
        <NavCard href="/admin/rentals/rent" icon={KeyRound} title="Rent Collection" desc="Due, overdue, partially paid." />
        <NavCard href="/admin/rentals/payments" icon={Wallet} title="Payments" desc="Every rent payment on record." />
        <NavCard href="/admin/rentals/deposits" icon={Wallet} title="Deposits" desc="Security deposits and deductions." />
        <NavCard href="/admin/rentals/expenses" icon={Wallet} title="Expenses" desc="Property expenses via Accounting." />
        <NavCard href="/admin/rentals/maintenance" icon={Building2} title="Maintenance" desc="Rental maintenance & landlord approval." />
        <NavCard href="/admin/rentals/notices" icon={FileText} title="Notices" desc="Rent, expiry, renewal, move-out notices." />
        <NavCard href="/admin/rentals/reports" icon={FileText} title="Reports" desc="Collection, occupancy, profitability." />
        {canManage && <NavCard href="/admin/rentals/settings" icon={Settings} title="Settings" desc="Late fees, grace period, reminders." />}
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Rental Properties</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">Landlord</th>
                <th className="px-4 py-3">Monthly Rent</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rentalProperties.slice(0, 10).map((rp) => (
                <tr key={rp.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                  <td className="px-4 py-3">
                    <Link href="/admin/rentals/properties" className="font-semibold text-primary hover:underline">
                      {rp.propertyTitle ?? "Untitled"} {rp.unitNumber ? `— ${rp.unitNumber}` : ""}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{rp.landlordName ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{rp.monthlyRent != null ? formatPKR(rp.monthlyRent) : "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={rp.rentalStatus} />
                  </td>
                </tr>
              ))}
              {rentalProperties.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted">
                    No rental properties yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-lg font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
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
