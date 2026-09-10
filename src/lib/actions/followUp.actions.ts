"use server";

import { revalidatePath } from "next/cache";
import { followUpService } from "@/services/followUpService";
import { profileService } from "@/services/profileService";
import type { FollowUpInput } from "@/lib/models/team";

function revalidateAll(leadId?: string) {
  revalidatePath("/admin/follow-ups");
  revalidatePath("/agent/dashboard");
  revalidatePath("/agent/leads");
  if (leadId) {
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath(`/agent/leads/${leadId}`);
  }
}

export async function createFollowUpAction(input: FollowUpInput) {
  const admin = await profileService.getCurrentAdmin();
  await followUpService.create(input, admin?.name ?? "Admin");
  revalidateAll(input.leadId);
}

export async function completeFollowUpAction(id: string, leadId?: string) {
  await followUpService.complete(id);
  revalidateAll(leadId);
}

export async function rescheduleFollowUpAction(id: string, date: string, time: string | undefined, leadId?: string) {
  await followUpService.reschedule(id, date, time);
  revalidateAll(leadId);
}

export async function cancelFollowUpAction(id: string, leadId?: string) {
  await followUpService.cancel(id);
  revalidateAll(leadId);
}
