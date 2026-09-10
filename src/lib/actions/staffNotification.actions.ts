"use server";

import { revalidatePath } from "next/cache";
import { staffNotificationService } from "@/services/staffNotificationService";

export async function markStaffNotificationReadAction(id: string) {
  await staffNotificationService.markRead(id);
  revalidatePath("/admin", "layout");
  revalidatePath("/agent", "layout");
}

export async function markAllStaffNotificationsReadAction(userId: string) {
  await staffNotificationService.markAllRead(userId);
  revalidatePath("/admin", "layout");
  revalidatePath("/agent", "layout");
}

/** Polled by StaffNotificationBell — lightweight count-only check. */
export async function getUnreadStaffNotificationCountAction(userId: string) {
  return staffNotificationService.unreadCount(userId);
}

/** Fetched when the bell dropdown opens. */
export async function listStaffNotificationsAction(userId: string) {
  return staffNotificationService.list(userId);
}
