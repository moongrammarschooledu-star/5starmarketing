"use server";

import { appointmentService } from "@/services/appointmentService";
import { customerService } from "@/services/customerService";
import type { TimeSlot } from "@/lib/models/appointment";

export async function getAvailabilityAction(dateISO: string): Promise<TimeSlot[]> {
  return appointmentService.getAvailability(dateISO);
}

export interface BookVisitState {
  error?: string;
  success?: {
    appointmentId: string;
    propertyTitle: string;
    appointmentDate: string;
    appointmentTime: string;
  };
}

const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export async function createAppointmentAction(
  propertyId: string,
  _prevState: BookVisitState,
  formData: FormData
): Promise<BookVisitState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const appointmentDate = String(formData.get("appointmentDate") ?? "").trim();
  const appointmentTime = String(formData.get("appointmentTime") ?? "").trim();
  const numberOfVisitors = Number(formData.get("numberOfVisitors") ?? 1) || 1;
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !phone || !appointmentDate || !appointmentTime) {
    return { error: "Please fill in your name, phone, and pick a date and time." };
  }
  if (!PHONE_PATTERN.test(phone)) {
    return { error: "Please enter a valid phone number." };
  }
  if (whatsapp && !PHONE_PATTERN.test(whatsapp)) {
    return { error: "Please enter a valid WhatsApp number." };
  }
  if (email && !EMAIL_PATTERN.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (numberOfVisitors < 1 || numberOfVisitors > 50) {
    return { error: "Please enter a realistic number of visitors." };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (appointmentDate < today) {
    return { error: "Please select a future date." };
  }

  try {
    const customer = await customerService.getCurrentCustomer();
    const appointment = await appointmentService.create({
      propertyId,
      customerId: customer?.id,
      name,
      phone,
      whatsapp: whatsapp || undefined,
      email: email || undefined,
      appointmentDate,
      appointmentTime,
      numberOfVisitors,
      message,
    });
    return {
      success: {
        appointmentId: appointment.id,
        propertyTitle: appointment.propertyTitle,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
      },
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not submit your site visit request." };
  }
}

export async function cancelAppointmentAction(id: string) {
  await appointmentService.cancelByCustomer(id);
}
