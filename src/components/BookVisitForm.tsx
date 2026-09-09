"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, CalendarClock, ArrowLeft, Users } from "lucide-react";
import clsx from "clsx";
import { createAppointmentAction, getAvailabilityAction, type BookVisitState } from "@/lib/actions/appointment.actions";
import { whatsappUrlFor } from "@/lib/site";
import type { TimeSlot } from "@/lib/models/appointment";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function BookVisitForm({
  propertyId,
  propertySlug,
  propertyTitle,
  whatsappNumber,
}: {
  propertyId: string;
  propertySlug: string;
  propertyTitle: string;
  whatsappNumber: string;
}) {
  const boundAction = createAppointmentAction.bind(null, propertyId);
  const [state, formAction, pending] = useActionState<BookVisitState, FormData>(boundAction, {});

  const [date, setDate] = useState(todayISO());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, startSlotsTransition] = useTransition();

  useEffect(() => {
    setSelectedTime(null);
    startSlotsTransition(async () => {
      const result = await getAvailabilityAction(date);
      setSlots(result);
    });
  }, [date]);

  if (state.success) {
    const s = state.success;
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="h-6 w-6" />
          <h2 className="font-heading text-lg font-bold">Your site visit request has been received.</h2>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-surface-muted p-4 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Property</div>
            <div className="mt-1 font-semibold text-ink">{s.propertyTitle}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Date</div>
            <div className="mt-1 font-semibold text-ink">{s.appointmentDate}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Time</div>
            <div className="mt-1 font-semibold text-ink">{s.appointmentTime}</div>
          </div>
        </div>

        <div className="mt-3 inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
          Status: Pending — awaiting confirmation
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/properties/${propertySlug}`}
            className="flex items-center gap-2 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Property
          </Link>
          <a
            href={whatsappUrlFor(
              whatsappNumber,
              `Assalam-o-Alaikum 5STAR.M, I just requested a site visit for ${s.propertyTitle} on ${s.appointmentDate} at ${s.appointmentTime}.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-success px-5 py-2.5 text-sm font-bold text-white hover:-translate-y-0.5"
          >
            WhatsApp 5STAR.M
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <input type="hidden" name="appointmentDate" value={date} />
      <input type="hidden" name="appointmentTime" value={selectedTime ?? ""} />

      {state.error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {state.error}
        </div>
      )}

      <div className="rounded-xl bg-surface-muted px-4 py-3 text-sm">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Property</span>
        <div className="mt-0.5 font-bold text-ink">{propertyTitle}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Customer Name" name="name" required placeholder="Your full name" />
        <Field label="Phone" name="phone" required placeholder="03XX-XXXXXXX" type="tel" />
        <Field label="WhatsApp Number" name="whatsapp" placeholder="Same as phone, if different" type="tel" />
        <Field label="Email" name="email" placeholder="you@example.com" type="email" />
      </div>

      <div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Preferred Date</span>
          <input
            type="date"
            required
            min={todayISO()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </label>
      </div>

      <div>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <CalendarClock className="h-4 w-4 text-primary" /> Preferred Time
        </span>
        {loadingSlots ? (
          <p className="mt-2 text-sm text-muted">Checking availability...</p>
        ) : slots.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No visits available on this date. Please choose a different date.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={!slot.available}
                onClick={() => setSelectedTime(slot.time)}
                className={clsx(
                  "rounded-full border-2 px-4 py-2 text-xs font-bold transition-colors",
                  !slot.available && "cursor-not-allowed border-border text-muted-foreground opacity-40 line-through",
                  slot.available && selectedTime === slot.time && "border-primary bg-primary text-primary-foreground",
                  slot.available && selectedTime !== slot.time && "border-ink/15 text-ink hover:border-primary hover:text-primary"
                )}
              >
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-ink">
          <Users className="h-4 w-4 text-primary" /> Number of Visitors
        </span>
        <input
          type="number"
          name="numberOfVisitors"
          min={1}
          max={50}
          defaultValue={1}
          className="w-full max-w-[140px] rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink">Additional Message</span>
        <textarea
          name="message"
          rows={3}
          placeholder="Anything else we should know before your visit?"
          className="w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
      </label>

      <button
        type="submit"
        disabled={pending || !selectedTime}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-hover disabled:translate-y-0 disabled:opacity-60"
      >
        {pending ? "Submitting..." : "Request Site Visit"}
      </button>
      {!selectedTime && <p className="text-center text-xs text-muted-foreground">Select a time slot to continue.</p>}
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}
