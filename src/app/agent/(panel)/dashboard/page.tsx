import Link from "next/link";
import { AlertTriangle, Users, Sparkles, CalendarClock, MapPin, ThumbsUp, CheckCircle2 } from "lucide-react";
import { profileService } from "@/services/profileService";
import { leadService } from "@/services/leadService";
import { followUpService } from "@/services/followUpService";
import { appointmentService } from "@/services/appointmentService";
import { StatCard } from "@/components/admin/StatCard";
import { FollowUpRowActions } from "@/components/admin/FollowUpRowActions";
import { formatDateOnly } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function AgentDashboardPage() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
        <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> You need to be signed in to view your dashboard.
      </div>
    );
  }

  let loadError: string | null = null;
  let leads: Awaited<ReturnType<typeof leadService.listByAgent>> = [];
  let todayFollowUps: Awaited<ReturnType<typeof followUpService.listByAgent>> = [];
  let upcomingFollowUps: Awaited<ReturnType<typeof followUpService.listByAgent>> = [];
  let overdueFollowUps: Awaited<ReturnType<typeof followUpService.listByAgent>> = [];
  let appointments: Awaited<ReturnType<typeof appointmentService.listByAgent>> = [];

  try {
    await followUpService.markOverdue();
    [leads, todayFollowUps, upcomingFollowUps, overdueFollowUps, appointments] = await Promise.all([
      leadService.listByAgent(admin.id),
      followUpService.listByAgent(admin.id, "today"),
      followUpService.listByAgent(admin.id, "upcoming"),
      followUpService.listByAgent(admin.id, "overdue"),
      appointmentService.listByAgent(admin.id),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load your dashboard.";
  }

  const newLeads = leads.filter((l) => l.status === "New").length;
  const interestedLeads = leads.filter((l) => l.status === "Interested").length;
  const closedLeads = leads.filter((l) => l.status === "Closed").length;
  const today = new Date().toISOString().slice(0, 10);
  const upcomingSiteVisits = appointments.filter((a) => a.appointmentDate >= today && a.status !== "Cancelled" && a.status !== "Completed").length;

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Welcome back, {admin.name.split(" ")[0]}.</h1>
      <p className="mt-1 text-sm text-muted">Here&apos;s what needs your attention today.</p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="My Leads" value={leads.length} icon={Users} />
        <StatCard label="New Leads" value={newLeads} icon={Sparkles} tone="primary" />
        <StatCard label="Follow-Ups Today" value={todayFollowUps.length} icon={CalendarClock} />
        <StatCard label="Upcoming Site Visits" value={upcomingSiteVisits} icon={MapPin} />
        <StatCard label="Interested" value={interestedLeads} icon={ThumbsUp} tone="success" />
        <StatCard label="Closed" value={closedLeads} icon={CheckCircle2} tone="success" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/agent/leads" className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
          View My Leads
        </Link>
        <Link href="/admin/appointments" className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
          View Appointments
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FollowUpList title="Today" followUps={todayFollowUps} />
        <FollowUpList title="Upcoming" followUps={upcomingFollowUps} />
        <FollowUpList title="Overdue" followUps={overdueFollowUps} tone="text-primary" />
      </div>
    </div>
  );
}

function FollowUpList({
  title,
  followUps,
  tone = "text-ink",
}: {
  title: string;
  followUps: Awaited<ReturnType<typeof followUpService.listByAgent>>;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className={`font-heading text-sm font-bold ${tone}`}>{title} Follow-Ups</h2>
      <div className="mt-3 space-y-2.5">
        {followUps.length === 0 && <p className="text-xs text-muted">Nothing here.</p>}
        {followUps.map((f) => (
          <div key={f.id} className="rounded-xl border border-border bg-surface-muted/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Link href={`/agent/leads/${f.leadId}`} className="text-sm font-bold text-ink hover:text-primary">
                  {f.leadName || "Lead"}
                </Link>
                <div className="text-xs text-muted">
                  {formatDateOnly(f.followUpDate)} {f.followUpTime ?? ""} · {f.type}
                </div>
              </div>
              <FollowUpRowActions id={f.id} status={f.status} leadId={f.leadId} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
