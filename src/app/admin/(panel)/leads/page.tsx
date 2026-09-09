import Link from "next/link";
import {
  Users,
  Sparkles,
  PhoneCall,
  CalendarClock,
  ThumbsUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { leadService } from "@/services/leadService";
import { StatCard } from "@/components/admin/StatCard";
import { LeadsViewSwitcher } from "@/components/admin/LeadsViewSwitcher";
import { LeadCharts } from "@/components/admin/LeadCharts";
import { FollowUpWhatsAppButton } from "@/components/admin/FollowUpWhatsAppButton";
import { formatDateOnlyShort } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  let stats = { total: 0, new: 0, contacted: 0, interested: 0, followUp: 0, closed: 0, lost: 0 };
  let leads: Awaited<ReturnType<typeof leadService.list>> = [];
  let todaysFollowUps: Awaited<ReturnType<typeof leadService.todaysFollowUps>> = [];
  let upcomingFollowUps: Awaited<ReturnType<typeof leadService.upcomingFollowUps>> = [];
  let insights: Awaited<ReturnType<typeof leadService.insights>> = {
    bySource: [],
    byStatus: [],
    topProperties: [],
  };
  let loadError: string | null = null;

  try {
    const [s, l, today, upcoming, i] = await Promise.all([
      leadService.stats(),
      leadService.list(),
      leadService.todaysFollowUps(),
      leadService.upcomingFollowUps(),
      leadService.insights(),
    ]);
    stats = s;
    leads = l;
    todaysFollowUps = today;
    upcomingFollowUps = upcoming;
    insights = i;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load leads.";
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Lead Management</h1>
      <p className="mt-1 text-sm text-muted">
        Every property inquiry, WhatsApp click and contact-form submission, in one CRM.
      </p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Total Leads" value={stats.total} icon={Users} />
        <StatCard label="New" value={stats.new} icon={Sparkles} tone="primary" />
        <StatCard label="Contacted" value={stats.contacted} icon={PhoneCall} />
        <StatCard label="Interested" value={stats.interested} icon={ThumbsUp} tone="success" />
        <StatCard label="Follow-Up" value={stats.followUp} icon={CalendarClock} />
        <StatCard label="Closed" value={stats.closed} icon={CheckCircle2} tone="success" />
        <StatCard label="Lost" value={stats.lost} icon={XCircle} />
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
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-surface px-3.5 py-2 text-sm"
                >
                  <Link href={`/admin/leads/${l.id}`} className="flex-1 font-semibold text-ink hover:text-primary">
                    {l.name}
                  </Link>
                  <span className="text-xs text-primary">{l.nextFollowUpTime?.slice(0, 5) ?? "Any time"}</span>
                  <FollowUpWhatsAppButton
                    leadId={l.id}
                    name={l.name}
                    phone={l.phone}
                    whatsapp={l.whatsapp}
                    propertyTitle={l.propertyTitle}
                  />
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
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3.5 py-2 text-sm"
                >
                  <Link href={`/admin/leads/${l.id}`} className="flex-1 font-semibold text-ink hover:text-primary">
                    {l.name}
                  </Link>
                  <span className="text-xs text-muted">
                    {l.nextFollowUpDate && formatDateOnlyShort(l.nextFollowUpDate)}
                  </span>
                  <FollowUpWhatsAppButton
                    leadId={l.id}
                    name={l.name}
                    phone={l.phone}
                    whatsapp={l.whatsapp}
                    propertyTitle={l.propertyTitle}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <LeadCharts {...insights} />
      </div>

      <div className="mt-8">
        <LeadsViewSwitcher leads={leads} />
      </div>
    </div>
  );
}
