import Link from "next/link";
import {
  Users,
  Sparkles,
  PhoneCall,
  ThumbsUp,
  MapPin,
  Handshake,
  CheckCircle2,
  XCircle,
  CalendarClock,
  UserX,
  AlertTriangle,
  Kanban,
  BarChart3,
  List,
} from "lucide-react";
import { leadService } from "@/services/leadService";
import { automationService } from "@/services/automationService";
import { leadScoringService } from "@/services/leadScoringService";
import { StatCard } from "@/components/admin/StatCard";
import { FollowUpWhatsAppButton } from "@/components/admin/FollowUpWhatsAppButton";
import { formatDateOnlyShort } from "@/lib/date";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function CrmDashboardPage() {
  await requireSection("leads");

  let stats: Awaited<ReturnType<typeof leadService.crmDashboardStats>> = {
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    siteVisit: 0,
    negotiation: 0,
    converted: 0,
    lost: 0,
    followUpDue: 0,
    unassigned: 0,
  };
  let todaysFollowUps: Awaited<ReturnType<typeof leadService.todaysFollowUps>> = [];
  let upcomingFollowUps: Awaited<ReturnType<typeof leadService.upcomingFollowUps>> = [];
  let loadError: string | null = null;

  try {
    // Marketing Automation (STEP 21) — no background job runner exists in
    // this deployment, so queued NEW_LEAD automation and SLA-breach
    // alerts are drained opportunistically here (same established
    // pattern as followUpService.markOverdue()).
    await Promise.all([automationService.processQueuedEvents().catch(() => {}), leadScoringService.sweepSlaBreaches().catch(() => {})]);

    const [s, today, upcoming] = await Promise.all([
      leadService.crmDashboardStats(),
      leadService.todaysFollowUps(),
      leadService.upcomingFollowUps(),
    ]);
    stats = s;
    todaysFollowUps = today;
    upcomingFollowUps = upcoming;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load CRM dashboard.";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">CRM Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Every property inquiry, WhatsApp click, callback and site-visit request, in one pipeline.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/crm/leads"
            className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary"
          >
            <List className="h-3.5 w-3.5" /> All Leads
          </Link>
          <Link
            href="/admin/crm/pipeline"
            className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary"
          >
            <Kanban className="h-3.5 w-3.5" /> Pipeline
          </Link>
          <Link
            href="/admin/crm/analytics"
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
          >
            <BarChart3 className="h-3.5 w-3.5" /> Analytics
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard label="Total Leads" value={stats.total} icon={Users} />
        <StatCard label="New" value={stats.new} icon={Sparkles} tone="primary" />
        <StatCard label="Contacted" value={stats.contacted} icon={PhoneCall} />
        <StatCard label="Qualified" value={stats.qualified} icon={ThumbsUp} tone="success" />
        <StatCard label="Site Visit" value={stats.siteVisit} icon={MapPin} />
        <StatCard label="Negotiation" value={stats.negotiation} icon={Handshake} tone="primary" />
        <StatCard label="Converted" value={stats.converted} icon={CheckCircle2} tone="success" />
        <StatCard label="Lost" value={stats.lost} icon={XCircle} />
        <StatCard label="Follow-Up Due" value={stats.followUpDue} icon={CalendarClock} tone="primary" />
        <StatCard label="Unassigned" value={stats.unassigned} icon={UserX} />
      </div>

      {(todaysFollowUps.length > 0 || upcomingFollowUps.length > 0) && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
              <CalendarClock className="h-4.5 w-4.5 text-primary" /> Today&apos;s Follow-Ups ({todaysFollowUps.length})
            </h2>
            <div className="mt-3 space-y-2">
              {todaysFollowUps.length === 0 && <p className="text-sm text-muted">None due today.</p>}
              {todaysFollowUps.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-surface px-3.5 py-2 text-sm">
                  <Link href={`/admin/crm/leads/${l.id}`} className="flex-1 font-semibold text-ink hover:text-primary">
                    {l.name}
                  </Link>
                  <span className="text-xs text-primary">{l.nextFollowUpTime?.slice(0, 5) ?? "Any time"}</span>
                  <FollowUpWhatsAppButton leadId={l.id} name={l.name} phone={l.phone} whatsapp={l.whatsapp} propertyTitle={l.propertyTitle} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
              <CalendarClock className="h-4.5 w-4.5 text-muted-foreground" /> Upcoming Follow-Ups
            </h2>
            <div className="mt-3 space-y-2">
              {upcomingFollowUps.length === 0 && <p className="text-sm text-muted">Nothing scheduled.</p>}
              {upcomingFollowUps.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3.5 py-2 text-sm">
                  <Link href={`/admin/crm/leads/${l.id}`} className="flex-1 font-semibold text-ink hover:text-primary">
                    {l.name}
                  </Link>
                  <span className="text-xs text-muted">{l.nextFollowUpDate && formatDateOnlyShort(l.nextFollowUpDate)}</span>
                  <FollowUpWhatsAppButton leadId={l.id} name={l.name} phone={l.phone} whatsapp={l.whatsapp} propertyTitle={l.propertyTitle} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
