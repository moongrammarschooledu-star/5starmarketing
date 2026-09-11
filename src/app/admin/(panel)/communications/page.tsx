import Link from "next/link";
import { Inbox, MessageSquareText, FileText, Clock, AlertOctagon, BarChart3, Settings, ArrowRight } from "lucide-react";
import { communicationService } from "@/services/communicationService";
import { profileService } from "@/services/profileService";
import { canManageCommunicationSettings } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function CommunicationsDashboardPage() {
  await requireSection("communications");
  await communicationService.processScheduledQueue().catch(() => {});
  const [stats, admin] = await Promise.all([communicationService.dashboardStats(), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageCommunicationSettings(admin.role) : false;

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Communication Center</h1>
      <p className="mt-1 text-sm text-muted">WhatsApp, Email, SMS, internal notes and portal messages — all in one place.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Open Conversations" value={stats.openConversations} />
        <StatCard label="Unassigned" value={stats.unassignedConversations} accent={stats.unassignedConversations > 0} />
        <StatCard label="Messages Sent" value={stats.messagesSent} />
        <StatCard label="Failed" value={stats.failedMessages} accent={stats.failedMessages > 0} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NavCard href="/admin/communications/inbox" icon={Inbox} title="Inbox" desc="The active working queue — open conversations across every channel." />
        <NavCard href="/admin/communications/conversations" icon={MessageSquareText} title="All Conversations" desc="The full searchable archive, including closed threads." />
        <NavCard href="/admin/communications/templates" icon={FileText} title="Templates" desc="WhatsApp, Email and SMS message templates." />
        <NavCard href="/admin/communications/scheduled" icon={Clock} title="Scheduled" desc="Messages queued to send later." />
        <NavCard href="/admin/communications/failed" icon={AlertOctagon} title="Failed Messages" desc="Retry or cancel messages that could not be delivered." />
        <NavCard href="/admin/communications/analytics" icon={BarChart3} title="Analytics" desc="Delivery, response-time and agent-performance metrics." />
        {canManage && <NavCard href="/admin/communications/settings" icon={Settings} title="Settings" desc="Provider status, test mode and business hours." />}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-2xl font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function NavCard({ href, icon: Icon, title, desc }: { href: string; icon: typeof Inbox; title: string; desc: string }) {
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
