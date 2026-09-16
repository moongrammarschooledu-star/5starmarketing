import Link from "next/link";
import { CalendarClock, MapPin, User } from "lucide-react";
import { profileService } from "@/services/profileService";
import { appointmentService } from "@/services/appointmentService";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

/** "Site Visits" (STEP 31 section 15/18/20) — the Agent Mobile App's
 *  own appointments tab. This codebase has one appointment concept
 *  (site visits ARE appointments); no separate table needed. */
export default async function AgentAppointmentsPage() {
  const admin = await profileService.getCurrentAdmin();
  const appointments = admin ? await appointmentService.listByAgent(admin.id) : [];

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Site Visits</h1>
      <p className="mt-1 text-sm text-muted">Appointments assigned to you.</p>

      <div className="mt-5 space-y-3">
        {appointments.map((a) => (
          <Link
            key={a.id}
            href={`/admin/appointments/${a.id}`}
            className="block rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-heading text-sm font-bold text-ink">{a.propertyTitle}</p>
              <StatusBadge status={a.status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-primary" /> {a.appointmentDate} at {a.appointmentTime}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" /> {a.name}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" /> {a.propertyLocation}
              </span>
            </div>
          </Link>
        ))}
        {appointments.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted">
            No site visits assigned to you yet.
          </p>
        )}
      </div>
    </div>
  );
}
