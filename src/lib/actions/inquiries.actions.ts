"use server";

import { revalidatePath } from "next/cache";
import { inquiriesRepository } from "@/lib/repositories/inquiries.repository";
import type { LeadStatus } from "@/lib/models/inquiry";

/** Fired from the property WhatsApp-inquiry buttons so the click shows up
 *  as a real lead in the admin dashboard, not just an outbound link. */
export async function trackWhatsAppInquiryAction(propertyTitle?: string, propertyId?: string) {
  await inquiriesRepository.create({
    name: "WhatsApp Visitor",
    phone: "Contacted via WhatsApp",
    propertyId,
    propertyTitle,
    message: propertyTitle
      ? `Assalam-o-Alaikum, I am interested in ${propertyTitle}. Please share complete details.`
      : "Started a WhatsApp chat from the website.",
    source: "WhatsApp",
  });
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/inquiries");
}

function revalidateAll() {
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin/dashboard");
}

export async function updateInquiryStatusAction(id: string, status: LeadStatus) {
  await inquiriesRepository.updateStatus(id, status);
  revalidateAll();
}

export async function deleteInquiryAction(id: string) {
  await inquiriesRepository.remove(id);
  revalidateAll();
}
