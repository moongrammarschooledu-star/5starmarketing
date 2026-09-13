import Link from "next/link";
import { LayoutDashboard, ClipboardList, Wrench, CalendarClock, Building2, Boxes, ClipboardCheck, BarChart3, Settings, ArrowRight } from "lucide-react";
import { maintenanceReportService } from "@/services/maintenanceReportService";
import { profileService } from "@/services/profileService";
import { canManageMaintenance } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

export default async function MaintenanceIndexPage() {
  await requireSection("maintenance");
  const [stats, admin] = await Promise.all([maintenanceReportService.dashboardStats(), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageMaintenance(admin.role) : false;

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Property Inspection &amp; Maintenance</h1>
      <p className="mt-1 text-sm text-muted">Inspections, defects, maintenance requests, work orders, vendors, assets and preventive maintenance — all from real, recorded data.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Open Requests" value={String(stats.openRequests)} />
        <StatCard label="High Priority" value={String(stats.highPriorityRequests)} accent={stats.highPriorityRequests > 0} />
        <StatCard label="In Progress Work Orders" value={String(stats.inProgressWorkOrders)} />
        <StatCard label="Overdue Work Orders" value={String(stats.overdueWorkOrders)} accent={stats.overdueWorkOrders > 0} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Upcoming Preventive Maintenance" value={String(stats.upcomingPreventiveMaintenance)} />
        <StatCard label="Maintenance Expenditure (Paid)" value={formatPKR(stats.maintenanceExpenditure)} />
        <StatCard label="Pending Vendor Invoices" value={String(stats.pendingVendorInvoices)} />
        <StatCard label="Avg. Resolution Time" value={stats.averageResolutionHours != null ? `${(stats.averageResolutionHours / 24).toFixed(1)}d` : "Insufficient data"} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NavCard href="/admin/maintenance/dashboard" icon={LayoutDashboard} title="Dashboard" desc="Charts, trends and vendor performance." />
        <NavCard href="/admin/maintenance/requests" icon={ClipboardList} title="Requests" desc="Customer and staff maintenance requests." />
        <NavCard href="/admin/maintenance/work-orders" icon={Wrench} title="Work Orders" desc="Assign, track and cost real work." />
        <NavCard href="/admin/inspections" icon={ClipboardCheck} title="Inspections" desc="Property condition inspections and reports." />
        <NavCard href="/admin/maintenance/schedules" icon={CalendarClock} title="Preventive Maintenance" desc="Recurring schedules and due dates." />
        <NavCard href="/admin/maintenance/vendors" icon={Building2} title="Vendors" desc="Contractor directory and performance." />
        <NavCard href="/admin/maintenance/assets" icon={Boxes} title="Assets" desc="Equipment, warranties and service history." />
        <NavCard href="/admin/maintenance/reports" icon={BarChart3} title="Reports" desc="Cost, recurring issues and exports." />
        {canManage && <NavCard href="/admin/maintenance/settings" icon={Settings} title="Settings" desc="SLA targets, thresholds and templates." />}
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
