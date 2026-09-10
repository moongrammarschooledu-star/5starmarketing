"use server";

import { revalidatePath } from "next/cache";
import { appointmentService } from "@/services/appointmentService";
import { profileService } from "@/services/profileService";
import type { AppointmentStatus } from "@/lib/models/appointment";

function revalidateAll(id?: string) {
  revalidatePath("/admin/appointments");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/dashboard");
  if (id) revalidatePath(`/admin/appointments/${id}`);
}

async function currentAdminName(): Promise<string> {
  const admin = await profileService.getCurrentAdmin();
  return admin?.name ?? "Admin";
}

export async function updateAppointmentStatusAction(id: string, status: AppointmentStatus) {
  const admin = await currentAdminName();
  try {
    await appointmentService.updateStatus(id, status, admin);
    revalidateAll(id);
  } catch (e) {
    console.error("updateAppointmentStatusAction failed:", e);
    throw e;
  }
}

export async function rescheduleAppointmentAction(id: string, newDate: string, newTime: string) {
  const admin = await currentAdminName();
  try {
    await appointmentService.reschedule(id, newDate, newTime, admin);
    revalidateAll(id);
  } catch (e) {
    console.error("rescheduleAppointmentAction failed:", e);
    throw e;
  }
}

export async function assignAppointmentAgentAction(id: string, agentId: string | null, agentName: string | null) {
  try {
    await appointmentService.assignAgentById(id, agentId, agentName);
    revalidateAll(id);
    revalidatePath("/agent/dashboard");
  } catch (e) {
    console.error("assignAppointmentAgentAction failed:", e);
    throw e;
  }
}

export async function updateAppointmentNotesAction(id: string, notes: string) {
  try {
    await appointmentService.updateAdminNotes(id, notes);
    revalidateAll(id);
  } catch (e) {
    console.error("updateAppointmentNotesAction failed:", e);
    throw e;
  }
}

export async function deleteAppointmentAction(id: string) {
  try {
    await appointmentService.remove(id);
    revalidateAll();
  } catch (e) {
    console.error("deleteAppointmentAction failed:", e);
    throw e;
  }
}
