import Link from "next/link";
import { LayoutDashboard, Ticket, AlertTriangle, ArrowUpCircle, Building2, Users, Clock, BookOpen, BarChart3, Settings, ArrowRight } from "lucide-react";
import { supportReportService } from "@/services/supportReportService";
import { profileService } from "@/services/profileService";
import { canManageSupport } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function SupportIndexPage() {
  await requireSection("support");
  const [stats, admin] = await Promise.all([supportReportService.dashboardStats(), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageSupport(admin.role) : false;

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Customer Support &amp; Service Desk</h1>
      <p className="mt-1 text-sm text-muted">Tickets, complaints, escalations and SLA — all from real, recorded activity.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Open Tickets" value={String(stats.openTickets)} />
        <StatCard label="New Today" value={String(stats.newTicketsToday)} />
        <StatCard label="Overdue SLA" value={String(stats.overdueSlaTickets)} accent={stats.overdueSlaTickets > 0} />
        <StatCard label="Complaints" value={String(stats.complaints)} accent={stats.complaints > 0} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <NavCard href="/admin/support/dashboard" icon={LayoutDashboard} title="Dashboard" desc="Full stats and trends." />
        <NavCard href="/admin/support/tickets" icon={Ticket} title="Tickets" desc="Every support ticket." />
        <NavCard href="/admin/support/complaints" icon={AlertTriangle} title="Complaints" desc="Complaint investigations." />
        <NavCard href="/admin/support/requests" icon={Ticket} title="Requests" desc="Non-complaint tickets." />
        <NavCard href="/admin/support/escalations" icon={ArrowUpCircle} title="Escalations" desc="Every escalation on record." />
        <NavCard href="/admin/support/departments" icon={Building2} title="Departments" desc="Departments, managers, staff." />
        <NavCard href="/admin/support/staff" icon={Users} title="Staff Performance" desc="Workload and resolution times." />
        <NavCard href="/admin/support/sla" icon={Clock} title="SLA Rules" desc="Response/resolution targets." />
        <NavCard href="/admin/support/knowledge-base" icon={BookOpen} title="Knowledge Base" desc="FAQ articles." />
        <NavCard href="/admin/support/reports" icon={BarChart3} title="Reports" desc="Exportable support reports." />
        {canManage && <NavCard href="/admin/support/settings" icon={Settings} title="Settings" desc="Business hours, categories, disclaimer." />}
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
