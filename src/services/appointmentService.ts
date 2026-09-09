import "server-only";
import { createClient } from "@/lib/supabase/server";
import { settingsService } from "./settingsService";
import { propertyService } from "./propertyService";
import { leadService } from "./leadService";
import { activityService } from "./activityService";
import { notificationService } from "./notificationService";
import type {
  Appointment,
  AppointmentInput,
  AppointmentSettings,
  AppointmentStatus,
  AppointmentHistoryEntry,
  TimeSlot,
  AppointmentStats,
} from "@/lib/models/appointment";
import type { NotificationType } from "@/lib/models/customer";

const KARACHI_TZ = "Asia/Karachi";

function nowInKarachi(): Date {
  // A Date whose getHours/getMinutes/etc. read as Karachi wall-clock time,
  // regardless of the server's own runtime timezone.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KARACHI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return new Date(`${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:00`);
}

function todayISO(): string {
  return nowInKarachi().toISOString().slice(0, 10);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Appointment {
  const property = row.properties;
  return {
    id: row.id,
    customerId: row.customer_id ?? undefined,
    propertyId: row.property_id,
    propertyTitle: property?.title ?? "Property",
    propertyLocation: property?.location ?? "",
    propertyImage: property?.images?.[0] ?? undefined,
    propertySlug: property?.slug ?? "",
    leadId: row.lead_id ?? undefined,
    name: row.name,
    phone: row.phone,
    whatsapp: row.whatsapp ?? undefined,
    email: row.email ?? undefined,
    appointmentDate: row.appointment_date,
    appointmentTime: String(row.appointment_time).slice(0, 5),
    numberOfVisitors: row.number_of_visitors ?? 1,
    message: row.message ?? "",
    status: row.status,
    assignedAgent: row.assigned_agent ?? undefined,
    adminNotes: row.admin_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapHistoryRow(row: any): AppointmentHistoryEntry {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    changedBy: row.changed_by ?? undefined,
    oldStatus: row.old_status ?? undefined,
    newStatus: row.new_status ?? undefined,
    oldDate: row.old_date ?? undefined,
    newDate: row.new_date ?? undefined,
    oldTime: row.old_time ? String(row.old_time).slice(0, 5) : undefined,
    newTime: row.new_time ? String(row.new_time).slice(0, 5) : undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

const SELECT_WITH_PROPERTY = "*, properties(title, location, images, slug)";

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export const appointmentService = {
  async resolveSettings(): Promise<AppointmentSettings> {
    const s = await settingsService.get();
    return {
      workingDays: s.appointmentWorkingDays,
      openingTime: s.appointmentOpeningTime,
      closingTime: s.appointmentClosingTime,
      slotDurationMinutes: s.appointmentSlotDurationMinutes,
      breakStart: s.appointmentBreakStart,
      breakEnd: s.appointmentBreakEnd,
      maxVisitors: s.appointmentMaxVisitors,
      bookingNoticeHours: s.appointmentBookingNoticeHours,
    };
  },

  /** Pure slot generation — every slot start time between opening and
   *  closing, stepping by slot duration, skipping any slot that overlaps
   *  the configured break window. */
  generateSlots(settings: AppointmentSettings): string[] {
    const slots: string[] = [];
    let cursor = settings.openingTime;
    const closeMinutes = timeToMinutes(settings.closingTime);
    const breakStartMin = settings.breakStart ? timeToMinutes(settings.breakStart) : null;
    const breakEndMin = settings.breakEnd ? timeToMinutes(settings.breakEnd) : null;

    while (timeToMinutes(cursor) + settings.slotDurationMinutes <= closeMinutes) {
      const cursorMin = timeToMinutes(cursor);
      const inBreak = breakStartMin !== null && breakEndMin !== null && cursorMin >= breakStartMin && cursorMin < breakEndMin;
      if (!inBreak) slots.push(cursor);
      cursor = addMinutes(cursor, settings.slotDurationMinutes);
    }
    return slots;
  },

  /** Real-time availability for one date — used both by the booking form
   *  (refreshed on date change) and re-checked again on submit. Slots in
   *  the past, on a non-working day, or already booked by an
   *  unassigned-agent appointment come back unavailable — nothing here
   *  is a guess. */
  async getAvailability(dateISO: string): Promise<TimeSlot[]> {
    const settings = await this.resolveSettings();
    const date = new Date(`${dateISO}T00:00:00`);
    const dayName = date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    if (!settings.workingDays.includes(dayName)) return [];

    const allSlots = this.generateSlots(settings);
    if (allSlots.length === 0) return [];

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("appointments")
      .select("appointment_time, assigned_agent, status")
      .eq("appointment_date", dateISO)
      .neq("status", "Cancelled");
    if (error) {
      console.error("appointmentService.getAvailability failed:", error);
      return allSlots.map((time) => ({ time, available: false }));
    }

    const bookedUnassigned = new Set(
      (data ?? []).filter((r) => !r.assigned_agent).map((r) => String(r.appointment_time).slice(0, 5))
    );

    const now = nowInKarachi();
    const isToday = dateISO === todayISO();
    const noticeMs = settings.bookingNoticeHours * 60 * 60 * 1000;

    return allSlots.map((time) => {
      if (bookedUnassigned.has(time)) return { time, available: false };
      if (isToday) {
        const slotDate = new Date(`${dateISO}T${time}:00`);
        if (slotDate.getTime() - now.getTime() < noticeMs) return { time, available: false };
      }
      return { time, available: true };
    });
  },

  /** Re-validates a specific date+time server-side right before booking
   *  (or rescheduling) — never trust the client's earlier availability
   *  fetch alone. */
  async isBookable(dateISO: string, time: string): Promise<boolean> {
    const slots = await this.getAvailability(dateISO);
    return slots.some((s) => s.time === time && s.available);
  },

  async checkConflict(dateISO: string, time: string, agent: string | null, excludeId?: string): Promise<boolean> {
    const supabase = await createClient();
    let query = supabase
      .from("appointments")
      .select("id, assigned_agent")
      .eq("appointment_date", dateISO)
      .eq("appointment_time", time)
      .neq("status", "Cancelled");
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query;
    if (error) {
      console.error("appointmentService.checkConflict failed:", error);
      return true; // fail closed — never let a check error silently allow a double-booking
    }
    return (data ?? []).some((r) => (r.assigned_agent ?? null) === agent);
  },

  /** Creates the appointment, links/creates the CRM lead (source
   *  "Site Visit"), records history, and notifies the customer if
   *  logged in. Availability is re-checked here, not just trusted from
   *  the form's last fetch. */
  async create(input: AppointmentInput): Promise<Appointment> {
    const property = await propertyService.getById(input.propertyId);
    if (!property) throw new Error("This property could not be found.");

    const bookable = await this.isBookable(input.appointmentDate, input.appointmentTime);
    if (!bookable) {
      throw new Error("This time slot is no longer available. Please select another time.");
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        customer_id: input.customerId || null,
        property_id: input.propertyId,
        name: input.name,
        phone: input.phone,
        whatsapp: input.whatsapp || null,
        email: input.email || null,
        appointment_date: input.appointmentDate,
        appointment_time: input.appointmentTime,
        number_of_visitors: input.numberOfVisitors,
        message: input.message,
      })
      .select(SELECT_WITH_PROPERTY)
      .single();

    if (error) {
      console.error("appointmentService.create failed:", error);
      if (error.code === "23505") {
        throw new Error("This time slot is no longer available. Please select another time.");
      }
      throw new Error("Could not submit your site visit request. Please try again or use WhatsApp.");
    }

    const appointment = mapRow(data);

    // CRM integration (STEP 11 section 15): attach to an existing lead
    // for this customer/phone where one exists, otherwise create a new
    // "Site Visit" lead — never both, and never silently skipped.
    try {
      let lead = await leadService.findExistingForContact(input.customerId, input.phone);
      if (!lead) {
        await leadService.create({
          name: input.name,
          phone: input.phone,
          whatsapp: input.whatsapp,
          email: input.email,
          propertyId: input.propertyId,
          propertyTitle: property.title,
          customerId: input.customerId,
          message: `Requested a site visit for ${property.title} on ${input.appointmentDate} at ${input.appointmentTime}.`,
          source: "Site Visit",
        });
        lead = await leadService.findExistingForContact(input.customerId, input.phone);
      } else {
        await leadService.addNote(
          lead.id,
          `Site visit requested for ${property.title} on ${input.appointmentDate} at ${input.appointmentTime}.`,
          "System"
        );
      }
      if (lead) {
        await supabase.from("appointments").update({ lead_id: lead.id }).eq("id", appointment.id);
        appointment.leadId = lead.id;
      }
    } catch (e) {
      console.error("appointmentService.create: CRM linking failed (appointment still saved):", e);
    }

    await supabase.from("appointment_history").insert({
      appointment_id: appointment.id,
      changed_by: input.customerId ? "Customer" : "Website",
      new_status: "Pending",
      new_date: input.appointmentDate,
      new_time: input.appointmentTime,
      note: "Site visit requested.",
    });

    if (input.customerId) {
      await notificationService.notify(
        input.customerId,
        "appointment_created",
        "Site visit request received",
        `Your site visit request for ${property.title} on ${input.appointmentDate} at ${input.appointmentTime} has been received and is awaiting confirmation.`,
        "appointment",
        appointment.id
      );
    }
    await activityService.log("New Appointment", `${input.name} — ${property.title} (${input.appointmentDate} ${input.appointmentTime})`, "appointment", appointment.id);

    return appointment;
  },

  async getById(id: string): Promise<Appointment | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("appointments").select(SELECT_WITH_PROPERTY).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async listByCustomer(customerId: string): Promise<Appointment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("appointments")
      .select(SELECT_WITH_PROPERTY)
      .eq("customer_id", customerId)
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false });
    if (error) {
      console.error("appointmentService.listByCustomer failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async listAll(filters?: {
    search?: string;
    date?: string;
    status?: AppointmentStatus;
    propertyId?: string;
    agent?: string;
  }): Promise<Appointment[]> {
    const supabase = await createClient();
    let query = supabase.from("appointments").select(SELECT_WITH_PROPERTY).order("appointment_date", { ascending: false }).order("appointment_time", { ascending: false });
    if (filters?.date) query = query.eq("appointment_date", filters.date);
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters?.agent) query = query.eq("assigned_agent", filters.agent);
    const { data, error } = await query;
    if (error) {
      console.error("appointmentService.listAll failed:", error);
      return [];
    }
    let rows = (data ?? []).map(mapRow);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (r) => r.name.toLowerCase().includes(q) || r.phone.includes(q) || r.propertyTitle.toLowerCase().includes(q)
      );
    }
    return rows;
  },

  async todaysAppointments(): Promise<Appointment[]> {
    return this.listAll({ date: todayISO() }).then((rows) => rows.filter((r) => r.status !== "Cancelled"));
  },

  async upcomingAppointments(limit = 5): Promise<Appointment[]> {
    const supabase = await createClient();
    const today = todayISO();
    const { data, error } = await supabase
      .from("appointments")
      .select(SELECT_WITH_PROPERTY)
      .gte("appointment_date", today)
      .in("status", ["Pending", "Confirmed", "Rescheduled"])
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true })
      .limit(limit);
    if (error) {
      console.error("appointmentService.upcomingAppointments failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async _addHistory(
    appointmentId: string,
    changedBy: string,
    changes: {
      oldStatus?: string;
      newStatus?: string;
      oldDate?: string;
      newDate?: string;
      oldTime?: string;
      newTime?: string;
      note?: string;
    }
  ) {
    const supabase = await createClient();
    await supabase.from("appointment_history").insert({
      appointment_id: appointmentId,
      changed_by: changedBy,
      old_status: changes.oldStatus ?? null,
      new_status: changes.newStatus ?? null,
      old_date: changes.oldDate ?? null,
      new_date: changes.newDate ?? null,
      old_time: changes.oldTime ?? null,
      new_time: changes.newTime ?? null,
      note: changes.note ?? null,
    });
  },

  async listHistory(appointmentId: string): Promise<AppointmentHistoryEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("appointment_history")
      .select("*")
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapHistoryRow);
  },

  async updateStatus(id: string, status: AppointmentStatus, changedBy: string, note?: string): Promise<Appointment | undefined> {
    const existing = await this.getById(id);
    if (!existing) return undefined;

    const supabase = await createClient();
    const { data, error } = await supabase.from("appointments").update({ status }).eq("id", id).select(SELECT_WITH_PROPERTY).maybeSingle();
    if (error) {
      console.error("appointmentService.updateStatus failed:", error);
      throw new Error("Could not update this appointment.");
    }
    const updated = data ? mapRow(data) : undefined;
    if (!updated) return undefined;

    await this._addHistory(id, changedBy, { oldStatus: existing.status, newStatus: status, note });

    const notifyMap: Partial<Record<AppointmentStatus, { type: NotificationType; title: string; message: string }>> = {
      Confirmed: {
        type: "appointment_confirmed",
        title: "Site visit confirmed",
        message: `Your site visit for ${updated.propertyTitle} on ${updated.appointmentDate} at ${updated.appointmentTime} has been confirmed by 5STAR.M Estate & Builders.`,
      },
      Cancelled: {
        type: "appointment_cancelled",
        title: "Site visit cancelled",
        message: `Your site visit for ${updated.propertyTitle} on ${updated.appointmentDate} at ${updated.appointmentTime} has been cancelled.`,
      },
      Completed: {
        type: "appointment_completed",
        title: "Site visit completed",
        message: `Your site visit for ${updated.propertyTitle} has been marked as completed. Thank you for visiting with 5STAR.M.`,
      },
    };
    const n = notifyMap[status];
    if (n && updated.customerId) {
      await notificationService.notify(updated.customerId, n.type, n.title, n.message, "appointment", id);
    }
    await activityService.log("Updated Appointment", `${updated.name} → ${status}`, "appointment", id);

    return updated;
  },

  async reschedule(id: string, newDate: string, newTime: string, changedBy: string): Promise<Appointment> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("Appointment not found.");

    if (existing.appointmentDate !== newDate || existing.appointmentTime !== newTime) {
      const conflict = await this.checkConflict(newDate, newTime, existing.assignedAgent ?? null, id);
      if (conflict) {
        throw new Error("This time slot is no longer available. Please select another time.");
      }
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("appointments")
      .update({ appointment_date: newDate, appointment_time: newTime, status: "Rescheduled" })
      .eq("id", id)
      .select(SELECT_WITH_PROPERTY)
      .single();
    if (error) {
      console.error("appointmentService.reschedule failed:", error);
      throw new Error("Could not reschedule this appointment.");
    }
    const updated = mapRow(data);

    await this._addHistory(id, changedBy, {
      oldStatus: existing.status,
      newStatus: "Rescheduled",
      oldDate: existing.appointmentDate,
      newDate,
      oldTime: existing.appointmentTime,
      newTime,
      note: "Rescheduled by admin.",
    });

    if (updated.customerId) {
      await notificationService.notify(
        updated.customerId,
        "appointment_rescheduled",
        "Site visit rescheduled",
        `Your site visit for ${updated.propertyTitle} has been rescheduled to ${newDate} at ${newTime}.`,
        "appointment",
        id
      );
    }
    await activityService.log("Rescheduled Appointment", `${updated.name} — ${updated.propertyTitle} → ${newDate} ${newTime}`, "appointment", id);

    return updated;
  },

  async assignAgent(id: string, agent: string | null): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("appointments").update({ assigned_agent: agent }).eq("id", id);
    if (error) throw new Error("Could not assign an agent.");
  },

  async updateAdminNotes(id: string, notes: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("appointments").update({ admin_notes: notes }).eq("id", id);
    if (error) throw new Error("Could not save notes.");
  },

  async cancelByCustomer(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("appointments").update({ status: "Cancelled" }).eq("id", id);
    if (error) {
      console.error("appointmentService.cancelByCustomer failed:", error);
      throw new Error("Could not cancel this appointment.");
    }
    await this._addHistory(id, "Customer", { newStatus: "Cancelled", note: "Cancelled by customer." });
    await activityService.log("Appointment Cancelled", `Cancelled by customer`, "appointment", id);
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) throw new Error("Could not delete this appointment.");
  },

  /** Business Reports appointment section (STEP 11 section 26). */
  async stats(): Promise<AppointmentStats> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("appointments").select("status, appointment_date, properties(title)");
    if (error) {
      console.error("appointmentService.stats failed:", error);
      throw new Error("Could not load appointment statistics.");
    }
    const rows = data ?? [];
    const count = (s: string) => rows.filter((r) => r.status === s).length;

    const tally = (values: string[]) => {
      const map = new Map<string, number>();
      for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
      return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    };

    return {
      total: rows.length,
      pending: count("Pending"),
      confirmed: count("Confirmed"),
      completed: count("Completed"),
      cancelled: count("Cancelled"),
      noShow: count("No Show"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      byProperty: tally(rows.map((r: any) => r.properties?.title ?? "Unknown")).slice(0, 10),
      byDate: Object.entries(
        rows.reduce((acc: Record<string, number>, r) => {
          acc[r.appointment_date] = (acc[r.appointment_date] ?? 0) + 1;
          return acc;
        }, {})
      )
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      byStatus: tally(rows.map((r) => r.status)),
    };
  },
};
