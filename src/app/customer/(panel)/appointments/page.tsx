import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { customerService } from "@/services/customerService";
import { appointmentService } from "@/services/appointmentService";
import { settingsService } from "@/services/settingsService";
import { site } from "@/lib/site";
import { CustomerAppointmentCard } from "@/components/customer/CustomerAppointmentCard";

export const metadata = { title: "My Appointments" };
export const dynamic = "force-dynamic";

export default async function CustomerAppointmentsPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const [appointments, settings] = await Promise.all([
    appointmentService.listByCustomer(customer.id),
    settingsService.get().catch(() => null),
  ]);
  const whatsappNumber = settings?.whatsapp || site.whatsappNumber;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = appointments.filter((a) => a.appointmentDate >= today && a.status !== "Cancelled");
  const past = appointments.filter((a) => a.appointmentDate < today || a.status === "Cancelled");

  if (appointments.length === 0) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">My Appointments</h1>
        <p className="mt-1 text-sm text-muted">Every site visit you&apos;ve requested.</p>
        <div className="mt-10 rounded-2xl border border-border bg-surface p-10 text-center">
          <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-heading text-lg font-bold text-ink">You haven&apos;t scheduled any site visits yet.</h2>
          <Link
            href="/properties"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
          >
            Browse Properties
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">My Appointments</h1>
      <p className="mt-1 text-sm text-muted">Every site visit you&apos;ve requested.</p>

      <div className="mt-6">
        <h2 className="font-heading text-sm font-bold text-ink">Upcoming Visits</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No upcoming visits.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((a) => (
              <CustomerAppointmentCard key={a.id} appointment={a} whatsappNumber={whatsappNumber} />
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div className="mt-10">
          <h2 className="font-heading text-sm font-bold text-ink">Past Visits</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((a) => (
              <CustomerAppointmentCard key={a.id} appointment={a} whatsappNumber={whatsappNumber} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
