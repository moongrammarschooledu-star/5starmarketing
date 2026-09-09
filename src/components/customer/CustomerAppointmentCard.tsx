"use client";

import Link from "next/link";
import { useTransition } from "react";
import { MapPin, MessageCircle, X } from "lucide-react";
import type { Appointment } from "@/lib/models/appointment";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cancelAppointmentAction } from "@/lib/actions/appointment.actions";
import { whatsappUrlFor } from "@/lib/site";
import { useToast } from "@/components/admin/ToastProvider";
import { useRouter } from "next/navigation";

export function CustomerAppointmentCard({ appointment, whatsappNumber }: { appointment: Appointment; whatsappNumber: string }) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/customer/appointments/${appointment.id}`} className="font-bold text-ink hover:text-primary">
            {appointment.propertyTitle}
          </Link>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <MapPin className="h-3.5 w-3.5 text-primary" /> {appointment.propertyLocation}
          </div>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink">
        <span>{appointment.appointmentDate}</span>
        <span>{appointment.appointmentTime}</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Link
          href={`/customer/appointments/${appointment.id}`}
          className="flex items-center justify-center rounded-full border-2 border-ink/15 px-3 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary"
        >
          View
        </Link>
        <a
          href={whatsappUrlFor(
            whatsappNumber,
            `Assalam-o-Alaikum 5STAR.M, I'm writing about my site visit for ${appointment.propertyTitle} on ${appointment.appointmentDate} at ${appointment.appointmentTime}.`
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 rounded-full bg-success px-3 py-2 text-xs font-bold text-white"
        >
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </a>
        {appointment.status === "Pending" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await cancelAppointmentAction(appointment.id);
                toast.show("Appointment cancelled.");
                router.refresh();
              })
            }
            className="flex items-center justify-center gap-1 rounded-full border-2 border-ink/15 px-3 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
