import Link from "next/link";
import { CalendarClock, AlertTriangle, User } from "lucide-react";
import { profileService } from "@/services/profileService";
import { followUpService } from "@/services/followUpService";
import { appointmentService } from "@/services/appointmentService";

export const dynamic = "force-dynamic";

/** "Tasks" (STEP 31 section 15/33) — this codebase has no generic
 *  CRM to-do table (only domain-specific ones like construction_tasks).
 *  Rather than inventing a parallel task system, an agent's tasks are a
 *  live computed view over what already exists: overdue + today's
 *  follow-ups, plus today's site visits — exactly what a "Today" screen
 *  in a real CRM app would show anyway. */
export default async function AgentTasksPage() {
  const admin = await profileService.getCurrentAdmin();
  const agentId = admin?.id;

  const [overdue, today, appointments] = agentId
    ? await Promise.all([
        followUpService.listByAgent(agentId, "overdue"),
        followUpService.listByAgent(agentId, "today"),
        appointmentService.listByAgent(agentId),
      ])
    : [[], [], []];

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysVisits = appointments.filter((a) => a.appointmentDate === todayStr && a.status !== "Cancelled" && a.status !== "Completed");

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Tasks</h1>
      <p className="mt-1 text-sm text-muted">Overdue and today&apos;s follow-ups, plus today&apos;s site visits.</p>

      {overdue.length > 0 && (
        <section className="mt-5">
          <h2 className="flex items-center gap-1.5 font-heading text-sm font-bold text-danger">
            <AlertTriangle className="h-4 w-4" /> Overdue Follow-Ups
          </h2>
          <div className="mt-2 space-y-2">
            {overdue.map((f) => (
              <Link key={f.id} href={`/agent/leads/${f.leadId}`} className="block rounded-xl border border-danger/30 bg-danger/5 p-3">
                <p className="text-sm font-bold text-ink">{f.leadName ?? "Lead"}</p>
                <p className="mt-0.5 text-xs text-muted">{f.note}</p>
                <p className="mt-1 text-[11px] font-semibold text-danger">Due {f.followUpDate}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-5">
        <h2 className="flex items-center gap-1.5 font-heading text-sm font-bold text-ink">
          <CalendarClock className="h-4 w-4 text-primary" /> Today&apos;s Follow-Ups
        </h2>
        <div className="mt-2 space-y-2">
          {today.map((f) => (
            <Link key={f.id} href={`/agent/leads/${f.leadId}`} className="block rounded-xl border border-border bg-surface p-3">
              <p className="text-sm font-bold text-ink">{f.leadName ?? "Lead"}</p>
              <p className="mt-0.5 text-xs text-muted">{f.note}</p>
            </Link>
          ))}
          {today.length === 0 && <p className="text-xs text-muted">No follow-ups due today.</p>}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="flex items-center gap-1.5 font-heading text-sm font-bold text-ink">
          <User className="h-4 w-4 text-primary" /> Today&apos;s Site Visits
        </h2>
        <div className="mt-2 space-y-2">
          {todaysVisits.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-surface p-3">
              <p className="text-sm font-bold text-ink">{a.propertyTitle}</p>
              <p className="mt-0.5 text-xs text-muted">
                {a.appointmentTime} — {a.name}
              </p>
            </div>
          ))}
          {todaysVisits.length === 0 && <p className="text-xs text-muted">No site visits scheduled today.</p>}
        </div>
      </section>
    </div>
  );
}
