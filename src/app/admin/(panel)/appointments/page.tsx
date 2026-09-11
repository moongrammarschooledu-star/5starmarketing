import { AlertTriangle, CalendarClock, Clock, CheckCircle2, XCircle } from "lucide-react";
import { appointmentService } from "@/services/appointmentService";
import { sweepSiteVisitReminders } from "@/services/communicationReminderService";
import { requireSection } from "@/lib/guard";
import { StatCard } from "@/components/admin/StatCard";
import { AppointmentsTable } from "@/components/admin/AppointmentsTable";

export const dynamic = "force-dynamic";

export default async function AdminAppointmentsPage() {
  await requireSection("appointments");

  let appointments: Awaited<ReturnType<typeof appointmentService.listAll>> = [];
  let loadError: string | null = null;
  try {
    appointments = await appointmentService.listAll();
    // Communication Center (STEP 22) — 24-hour-ahead WhatsApp reminders
    // for tomorrow's confirmed site visits, swept opportunistically on
    // this page load (no background job runner in this deployment).
    await sweepSiteVisitReminders().catch(() => {});
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load appointments.";
  }

  const pending = appointments.filter((a) => a.status === "Pending").length;
  const confirmed = appointments.filter((a) => a.status === "Confirmed").length;
  const completed = appointments.filter((a) => a.status === "Completed").length;
  const cancelled = appointments.filter((a) => a.status === "Cancelled" || a.status === "No Show").length;

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Appointments</h1>
      <p className="mt-1 text-sm text-muted">Every property site visit request, in one place.</p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total" value={appointments.length} icon={CalendarClock} />
        <StatCard label="Pending" value={pending} icon={Clock} tone="primary" />
        <StatCard label="Confirmed" value={confirmed} icon={CheckCircle2} tone="success" />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} tone="success" />
        <StatCard label="Cancelled / No Show" value={cancelled} icon={XCircle} />
      </div>

      <div className="mt-8">
        <AppointmentsTable appointments={appointments} />
      </div>
    </div>
  );
}
