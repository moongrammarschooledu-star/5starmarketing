import Link from "next/link";
import { LayoutDashboard, Building2, ShieldCheck, FileStack, FileSearch, ClipboardCheck, CheckSquare, Gavel, Mail, FileSignature, ScrollText, AlertTriangle, CalendarDays, BarChart3, Settings, ArrowRight, Info } from "lucide-react";
import { legalReportService } from "@/services/legalReportService";
import { profileService } from "@/services/profileService";
import { canManageLegal } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function LegalIndexPage() {
  await requireSection("legal");
  const [stats, admin] = await Promise.all([legalReportService.dashboardStats(), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageLegal(admin.role) : false;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Legal, Compliance &amp; Due Diligence</h1>
          <p className="mt-1 text-sm text-muted">Ownership, documents, due diligence, compliance, cases, notices and contracts — all from real, recorded data.</p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>This module is not a substitute for a licensed lawyer, solicitor, notary, or government land/registration authority. Every status shown reflects only what has actually been recorded or verified here.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Properties w/ Legal Record" value={String(stats.totalPropertiesWithLegalRecords)} />
        <StatCard label="Ownership Incomplete" value={String(stats.ownershipAllocationsIncomplete)} accent={stats.ownershipAllocationsIncomplete > 0} />
        <StatCard label="Open Due-Diligence Cases" value={String(stats.openDueDiligenceCases)} />
        <StatCard label="Due-Diligence Overdue" value={String(stats.dueDiligenceOverdue)} accent={stats.dueDiligenceOverdue > 0} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Documents Expiring Soon" value={String(stats.documentsExpiringSoon)} accent={stats.documentsExpiringSoon > 0} />
        <StatCard label="Active Encumbrances" value={String(stats.activeEncumbrances)} accent={stats.activeEncumbrances > 0} />
        <StatCard label="Open Legal Cases" value={String(stats.openLegalCases)} />
        <StatCard label="Critical Risks" value={String(stats.criticalLegalRisks)} accent={stats.criticalLegalRisks > 0} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <NavCard href="/admin/legal/dashboard" icon={LayoutDashboard} title="Dashboard" desc="Full stats and the legal calendar." />
        <NavCard href="/admin/legal/properties" icon={Building2} title="Properties" desc="Every property with a legal record." />
        <NavCard href="/admin/legal/ownership" icon={ShieldCheck} title="Ownership" desc="Owners, shares, transfer history." />
        <NavCard href="/admin/legal/documents" icon={FileStack} title="Legal Documents" desc="Title/ownership/legal document vault." />
        <NavCard href="/admin/legal/verification" icon={FileSearch} title="Verification Queue" desc="Documents awaiting review." />
        <NavCard href="/admin/legal/due-diligence" icon={ClipboardCheck} title="Due Diligence" desc="DD cases and checklist results." />
        <NavCard href="/admin/legal/compliance" icon={CheckSquare} title="Compliance" desc="Property/project compliance records." />
        <NavCard href="/admin/legal/cases" icon={Gavel} title="Legal Cases" desc="Court/legal matters and hearings." />
        <NavCard href="/admin/legal/notices" icon={Mail} title="Legal Notices" desc="Demand, warning, termination notices." />
        <NavCard href="/admin/legal/contracts" icon={FileSignature} title="Contracts" desc="Sale/rental/agency/NOC contracts." />
        <NavCard href="/admin/legal/approvals" icon={ScrollText} title="Approvals" desc="Pending legal approval requests." />
        <NavCard href="/admin/legal/risks" icon={AlertTriangle} title="Risks" desc="Flagged risk / requires-review items." />
        <NavCard href="/admin/legal/events" icon={CalendarDays} title="Legal Calendar" desc="Every real upcoming legal date." />
        <NavCard href="/admin/legal/reports" icon={BarChart3} title="Reports" desc="Exportable legal reports." />
        {canManage && <NavCard href="/admin/legal/settings" icon={Settings} title="Settings" desc="Reminders, confidentiality, deal gate." />}
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
