"use server";

import { revalidatePath } from "next/cache";
import { settingsService } from "@/services/settingsService";

export interface SettingsFormState {
  error?: string;
  success?: boolean;
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
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save settings." };
  }

  revalidatePath("/admin/settings");
  return { success: true };
}
