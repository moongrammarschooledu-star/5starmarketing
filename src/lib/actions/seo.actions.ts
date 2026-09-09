"use server";

import { revalidatePath } from "next/cache";
import { settingsService } from "@/services/settingsService";

export interface SeoFormState {
  error?: string;
  success?: boolean;
}

export async function updateSeoSettingsAction(
  _prevState: SeoFormState,
  formData: FormData
): Promise<SeoFormState> {
  try {
    await settingsService.update({
      seoSiteTitle: String(formData.get("seoSiteTitle") ?? "").trim() || undefined,
      seoSiteDescription: String(formData.get("seoSiteDescription") ?? "").trim() || undefined,
      seoDefaultOgImage: String(formData.get("seoDefaultOgImage") ?? "").trim() || undefined,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save SEO settings." };
  }

  revalidatePath("/admin/seo");
  revalidatePath("/");
  return { success: true };
}
