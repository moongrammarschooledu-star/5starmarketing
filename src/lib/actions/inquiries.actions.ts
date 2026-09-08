"use server";

import { revalidatePath } from "next/cache";
import { inquiryService } from "@/services/inquiryService";
import type { LeadStatus } from "@/lib/models/inquiry";

/** Fired from the property WhatsApp-inquiry buttons so the click shows up
 *  as a real lead in the admin dashboard, not just an outbound link. */
export async function trackWhatsAppInquiryAction(propertyTitle?: string, propertyId?: string) {
  try {
    await inquiryService.create({
      name: "WhatsApp Visitor",
      phone: "Contacted via WhatsApp",
      propertyId,
      propertyTitle,
      message: propertyTitle
        ? `Assalam-o-Alaikum, I am interested in ${propertyTitle}. Please share complete details.`
        : "Started a WhatsApp chat from the website.",
      source: "WhatsApp",
    });
  } catch (e) {
    // Never block the visitor's WhatsApp click over a logging failure.
    console.error("trackWhatsAppInquiryAction failed:", e);
    return;
  }
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/inquiries");
}

function revalidateAll() {
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin/dashboard");
}

export async function updateInquiryStatusAction(id: string, status: LeadStatus) {
  try {
    await inquiryService.updateStatus(id, status);
    revalidateAll();
  } catch (e) {
    console.error("updateInquiryStatusAction failed:", e);
  }
}

export async function deleteInquiryAction(id: string) {
  try {
    await inquiryService.remove(id);
    revalidateAll();
  } catch (e) {
    console.error("deleteInquiryAction failed:", e);
  }
}
