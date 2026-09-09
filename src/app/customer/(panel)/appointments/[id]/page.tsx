import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Users, MessageCircle } from "lucide-react";
import { customerService } from "@/services/customerService";
import { appointmentService } from "@/services/appointmentService";
import { settingsService } from "@/services/settingsService";
import { site, whatsappUrlFor } from "@/lib/site";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata = { title: "Appointment Details" };
export const dynamic = "force-dynamic";

export default async function CustomerAppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const [appointment, settings] = await Promise.all([appointmentService.getById(id), settingsService.get().catch(() => null)]);
  if (!appointment || appointment.customerId !== customer.id) notFound();

  const whatsappNumber = settings?.whatsapp || site.whatsappNumber;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/customer/appointments" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to My Appointments
      </Link>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        {appointment.propertyImage && (
          <div className="relative h-48 w-full">
            <Image
              src={appointment.propertyImage}
              alt={appointment.propertyTitle}
              fill
              sizes="640px"
              className="object-cover"
              unoptimized={appointment.propertyImage.startsWith("data:")}
            />
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-heading text-xl font-extrabold text-ink">{appointment.propertyTitle}</h1>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <MapPin className="h-4 w-4 text-primary" /> {appointment.propertyLocation}
              </div>
            </div>
            <StatusBadge status={appointment.status} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
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
          </div>

          {appointment.message && (
            <div className="mt-5 rounded-xl bg-surface-muted p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your Message</div>
              <p className="mt-1.5 whitespace-pre-line text-sm text-ink">{appointment.message}</p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/properties/${appointment.propertySlug}`}
              className="flex items-center gap-2 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary"
            >
              View Property
            </Link>
            <a
              href={whatsappUrlFor(
                whatsappNumber,
                `Assalam-o-Alaikum 5STAR.M, I'm writing about my site visit for ${appointment.propertyTitle} on ${appointment.appointmentDate} at ${appointment.appointmentTime}.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-success px-5 py-2.5 text-sm font-bold text-white hover:-translate-y-0.5"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp 5STAR.M
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
