import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Mail, MessageCircle, MapPin, Users } from "lucide-react";
import { appointmentService } from "@/services/appointmentService";
import { teamService } from "@/services/teamService";
import { profileService } from "@/services/profileService";
import { requireSection } from "@/lib/guard";
import { canAccess } from "@/lib/permissions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AppointmentManagePanel } from "@/components/admin/AppointmentManagePanel";
import { whatsappUrlFor } from "@/lib/site";

export const dynamic = "force-dynamic";

function confirmationMessage(name: string, property: string, date: string, time: string) {
  return `Assalam-o-Alaikum ${name},\n\nYour site visit request for:\n\n${property}\n\nDate: ${date}\nTime: ${time}\n\nhas been confirmed by 5STAR.M Estate & Builders.\n\nFor assistance:\n+92 319 8430458`;
}

function pendingMessage(name: string) {
  return `Assalam-o-Alaikum ${name},\n\nYour site visit request has been received and is awaiting confirmation.`;
}

export default async function AdminAppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("appointments");
  const { id } = await params;

  const appointment = await appointmentService.getById(id);
  if (!appointment) notFound();

  const [history, assignableAgents, admin] = await Promise.all([
    appointmentService.listHistory(id),
    teamService.listAssignable(),
    profileService.getCurrentAdmin(),
  ]);
  const canManage = admin ? canAccess(admin.role, "team") : false;
  const waMessage = appointment.status === "Confirmed"
    ? confirmationMessage(appointment.name, appointment.propertyTitle, appointment.appointmentDate, appointment.appointmentTime)
    : pendingMessage(appointment.name);

  return (
    <div>
      <Link href="/admin/appointments" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Appointments
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-6">
        <div>
          <h1 className="font-heading text-xl font-extrabold text-ink">{appointment.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-primary" /> {appointment.phone}</span>
            {appointment.email && <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-primary" /> {appointment.email}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={appointment.status} />
          <a
            href={whatsappUrlFor(appointment.whatsapp || appointment.phone, waMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-success px-4 py-2 text-xs font-bold text-white"
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-heading text-sm font-bold text-ink">Appointment Information</h2>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Date</div>
                <div className="mt-1 font-semibold text-ink">{appointment.appointmentDate}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Time</div>
                <div className="mt-1 font-semibold text-ink">{appointment.appointmentTime}</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <Users className="h-3 w-3" /> Visitors
                </div>
                <div className="mt-1 font-semibold text-ink">{appointment.numberOfVisitors}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Assigned Agent</div>
                <div className="mt-1 font-semibold text-ink">{appointment.assignedAgent || "Unassigned"}</div>
              </div>
            </div>
            {appointment.message && (
              <div className="mt-4 rounded-xl bg-surface-muted p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Customer Message</div>
                <p className="mt-1.5 whitespace-pre-line text-sm text-ink">{appointment.message}</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-heading text-sm font-bold text-ink">Property</h2>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <Link href={`/admin/properties/${appointment.propertyId}/edit`} className="font-bold text-ink hover:text-primary">
                  {appointment.propertyTitle}
                </Link>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> {appointment.propertyLocation}
                </div>
              </div>
              <Link href={`/properties/${appointment.propertySlug}`} target="_blank" className="text-xs font-bold text-primary hover:underline">
                View on site →
              </Link>
            </div>
          </div>

          <AppointmentManagePanel appointment={appointment} assignableAgents={assignableAgents} canAssign={canManage} />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-heading text-sm font-bold text-ink">History</h2>
          <div className="mt-3 space-y-3">
            {history.length === 0 && <p className="text-sm text-muted">No changes yet.</p>}
            {history.map((h) => (
              <div key={h.id} className="border-l-2 border-primary/30 pl-3">
                <div className="text-xs font-bold text-ink">
                  {h.newStatus ?? "Updated"}
                  {h.changedBy && <span className="ml-1 font-normal text-muted-foreground">by {h.changedBy}</span>}
                </div>
                {(h.newDate || h.newTime) && (
                  <div className="text-xs text-muted">
                    {h.newDate ?? appointment.appointmentDate} {h.newTime ?? ""}
                  </div>
                )}
                {h.note && <div className="mt-0.5 text-xs text-muted">{h.note}</div>}
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {new Date(h.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
