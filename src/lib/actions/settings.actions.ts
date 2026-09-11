"use server";

import { revalidatePath } from "next/cache";
import { settingsService } from "@/services/settingsService";
import type { WebsiteSettings } from "@/lib/models/settings";

export interface SettingsFormState {
  error?: string;
  success?: boolean;
}

function numberOrUndefined(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw ? Number(raw) : undefined;
}

export async function updateSettingsAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const businessName = String(formData.get("businessName") ?? "").trim();
  if (!businessName) return { error: "Business name is required." };

  try {
    await settingsService.update({
      businessName,
      tagline: String(formData.get("tagline") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      whatsapp: String(formData.get("whatsapp") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      facebookUrl: String(formData.get("facebookUrl") ?? "").trim(),
      instagramUrl: String(formData.get("instagramUrl") ?? "").trim(),
      tiktokUrl: String(formData.get("tiktokUrl") ?? "").trim(),
      youtubeUrl: String(formData.get("youtubeUrl") ?? "").trim(),
      logoUrl: String(formData.get("logoUrl") ?? "").trim() || undefined,
      faviconUrl: String(formData.get("faviconUrl") ?? "").trim() || undefined,
      whatsappDisplayName: String(formData.get("whatsappDisplayName") ?? "").trim(),
      whatsappDefaultGreeting: String(formData.get("whatsappDefaultGreeting") ?? "").trim(),
      whatsappDefaultInquiryMessage: String(formData.get("whatsappDefaultInquiryMessage") ?? "").trim(),
      city: String(formData.get("city") ?? "").trim(),
      country: String(formData.get("country") ?? "").trim(),
      latitude: numberOrUndefined(formData.get("latitude")),
      longitude: numberOrUndefined(formData.get("longitude")),
      websiteUrl: String(formData.get("websiteUrl") ?? "").trim() || undefined,
      businessDescription: String(formData.get("businessDescription") ?? "").trim() || undefined,
      appointmentWorkingDays: formData.getAll("appointmentWorkingDays").map((v) => String(v)),
      appointmentOpeningTime: String(formData.get("appointmentOpeningTime") ?? "").trim() || undefined,
      appointmentClosingTime: String(formData.get("appointmentClosingTime") ?? "").trim() || undefined,
      appointmentSlotDurationMinutes: numberOrUndefined(formData.get("appointmentSlotDurationMinutes")),
      appointmentBreakStart: String(formData.get("appointmentBreakStart") ?? "").trim() || undefined,
      appointmentBreakEnd: String(formData.get("appointmentBreakEnd") ?? "").trim() || undefined,
      appointmentMaxVisitors: numberOrUndefined(formData.get("appointmentMaxVisitors")),
      appointmentBookingNoticeHours: numberOrUndefined(formData.get("appointmentBookingNoticeHours")),
      leadAssignmentMethod: String(formData.get("leadAssignmentMethod") ?? "Manual") as WebsiteSettings["leadAssignmentMethod"],
      defaultCommissionRate: numberOrUndefined(formData.get("defaultCommissionRate")),
      requireDocumentsForDealCompletion: formData.get("requireDocumentsForDealCompletion") === "on",
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save settings." };
  }

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function updateMarketingSettingsAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  try {
    await settingsService.update({
      marketingDefaultUtmSource: String(formData.get("marketingDefaultUtmSource") ?? "").trim() || undefined,
      marketingDefaultUtmMedium: String(formData.get("marketingDefaultUtmMedium") ?? "").trim() || undefined,
      marketingDefaultCampaign: String(formData.get("marketingDefaultCampaign") ?? "").trim() || undefined,
      marketingAttributionWindowDays: numberOrUndefined(formData.get("marketingAttributionWindowDays")) ?? 30,
      marketingDefaultLandingPage: String(formData.get("marketingDefaultLandingPage") ?? "").trim() || undefined,
      whatsapp: String(formData.get("whatsapp") ?? "").trim() || undefined,
      leadScoreThresholdWarm: numberOrUndefined(formData.get("leadScoreThresholdWarm")) ?? 20,
      leadScoreThresholdHot: numberOrUndefined(formData.get("leadScoreThresholdHot")) ?? 40,
      leadScoreThresholdVeryHot: numberOrUndefined(formData.get("leadScoreThresholdVeryHot")) ?? 70,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save marketing settings." };
  }

  revalidatePath("/admin/settings/marketing");
  return { success: true };
}
