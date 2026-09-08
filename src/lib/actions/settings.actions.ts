"use server";

import { revalidatePath } from "next/cache";
import { settingsRepository } from "@/lib/repositories/settings.repository";

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

  await settingsRepository.update({
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
  });

  revalidatePath("/admin/settings");
  return { success: true };
}
