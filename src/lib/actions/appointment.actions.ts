"use server";

import { headers } from "next/headers";
import { appointmentService } from "@/services/appointmentService";
import { customerService } from "@/services/customerService";
import { isRateLimited } from "@/lib/rateLimit";
import type { TimeSlot } from "@/lib/models/appointment";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

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
  // Honeypot: a hidden field real visitors never fill in. Bots that
  // auto-fill every field trip it — respond as if it worked so they
  // don't learn to avoid the trap, but never actually book anything.
  const honeypot = String(formData.get("company") ?? "").trim();
  if (honeypot) {
    return { success: { appointmentId: "", propertyTitle: "", appointmentDate: "", appointmentTime: "" } };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`book-visit:${ip}`, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX)) {
    return { error: "Too many requests. Please try again in a minute." };
  }

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
